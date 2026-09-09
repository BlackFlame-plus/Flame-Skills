import {
  assertReadablePath,
  assertTransition,
  createManagedNote,
  parseFrontmatter,
  sha256,
  updateFrontmatter,
  validateNote,
  type CreateManagedNoteInput
} from "./governance.js";
import type { MoveResult } from "./obsidian-client.js";

export interface KnowledgeClient {
  health(): Promise<unknown>;
  search(query: string, limit: number): Promise<unknown[]>;
  read(path: string): Promise<string>;
  writeNew(path: string, content: string): Promise<void>;
  moveSafely(
    source: string,
    destination: string,
    expectedHash: string,
    destinationContent?: string
  ): Promise<MoveResult>;
}

export interface NotePathInput {
  path: string;
}

export interface CaptureInput {
  title: string;
  body: string;
  confidentiality?: CreateManagedNoteInput["confidentiality"];
}

export interface MoveInput {
  source: string;
  destination: string;
  expectedHash: string;
}

export interface PromoteInput extends MoveInput {
  destinationContent: string;
}

function invalidNoteMessage(issues: string[]): string {
  return `Note validation failed: ${issues.join("; ")}`;
}

export function createToolHandlers(client: KnowledgeClient) {
  async function validateExisting(pathInput: string) {
    const path = assertReadablePath(pathInput);
    const content = await client.read(path);
    const hash = sha256(content);
    const issues = validateNote(content, path);
    return { path, content, hash, issues };
  }

  return {
    async healthCheck() {
      return client.health();
    },

    async searchNotes(input: { query: string; limit?: number }) {
      const limit = Math.max(1, Math.min(input.limit ?? 10, 50));
      return {
        query: input.query,
        matches: await client.search(input.query, limit)
      };
    },

    async readNote(input: NotePathInput) {
      const path = assertReadablePath(input.path);
      const content = await client.read(path);
      return { path, content, hash: sha256(content) };
    },

    async captureInbox(input: CaptureInput) {
      const note = createManagedNote({ kind: "inbox", ...input });
      await client.writeNew(note.path, note.content);
      return { path: note.path, hash: note.hash, status: "created" as const };
    },

    async saveAiDraft(input: CaptureInput) {
      const note = createManagedNote({ kind: "ai-draft", ...input });
      await client.writeNew(note.path, note.content);
      return { path: note.path, hash: note.hash, status: "created" as const };
    },

    async validateNote(input: NotePathInput) {
      const result = await validateExisting(input.path);
      return {
        path: result.path,
        hash: result.hash,
        valid: result.issues.length === 0,
        issues: result.issues
      };
    },

    async promoteNote(input: PromoteInput) {
      const transition = assertTransition(input.source, input.destination);
      if (transition.kind !== "promote") {
        throw new Error("Use obsidian_archive_note for archive transitions.");
      }
      const validation = await validateExisting(transition.source);
      if (validation.issues.length > 0) {
        throw new Error(invalidNoteMessage(validation.issues));
      }
      const destinationIssues = validateNote(
        input.destinationContent,
        transition.destination
      );
      const destinationProperties = parseFrontmatter(input.destinationContent);
      if (destinationProperties.reviewed !== true) {
        destinationIssues.push(
          "Promotion content must have reviewed: true after human review."
        );
      }
      if (
        transition.destination.startsWith("30_Knowledge/") &&
        destinationProperties.type !== "knowledge"
      ) {
        destinationIssues.push(
          "Notes promoted to 30_Knowledge must have type: knowledge."
        );
      }
      if (
        transition.destination.startsWith("40_Output/") &&
        destinationProperties.type !== "output"
      ) {
        destinationIssues.push(
          "Notes promoted to 40_Output must have type: output."
        );
      }
      if (destinationIssues.length > 0) {
        throw new Error(invalidNoteMessage(destinationIssues));
      }
      return client.moveSafely(
        transition.source,
        transition.destination,
        input.expectedHash,
        input.destinationContent
      );
    },

    async archiveNote(input: MoveInput) {
      const transition = assertTransition(input.source, input.destination);
      if (transition.kind !== "archive") {
        throw new Error("Archive destination must be under 50_Archive.");
      }
      const validation = await validateExisting(transition.source);
      if (validation.issues.length > 0) {
        throw new Error(invalidNoteMessage(validation.issues));
      }
      const archivedContent = updateFrontmatter(validation.content, {
        status: "archived",
        updated: new Date().toISOString().slice(0, 10)
      });
      return client.moveSafely(
        transition.source,
        transition.destination,
        input.expectedHash,
        archivedContent
      );
    }
  };
}

export type ToolHandlers = ReturnType<typeof createToolHandlers>;
