import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ObsidianClient } from "./obsidian-client.js";
import { createToolHandlers } from "./tools.js";

const VERSION = "0.1.0";
const pathSchema = z
  .string()
  .min(1)
  .describe("Vault-relative Markdown path using forward slashes.");
const expectedHashSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/)
  .describe("SHA-256 hash returned by the latest read or validation.");
const confidentialitySchema = z
  .enum(["public", "internal", "confidential", "secret"])
  .default("internal");

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value.toLowerCase() === "true";
}

const client = new ObsidianClient({
  baseUrl: process.env.OBSIDIAN_API_URL ?? "",
  apiKey: process.env.OBSIDIAN_API_KEY ?? "",
  allowInsecureTls: parseBoolean(
    process.env.OBSIDIAN_ALLOW_INSECURE_TLS,
    false
  )
});
const handlers = createToolHandlers(client);
const server = new McpServer({
  name: "obsidian-knowledge",
  version: VERSION
});

function success(result: unknown) {
  const structured =
    typeof result === "object" && result !== null
      ? (result as Record<string, unknown>)
      : { result };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    structuredContent: structured
  };
}

function failed(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true
  };
}

async function run<T>(operation: () => Promise<T>) {
  try {
    return success(await operation());
  } catch (error) {
    return failed(error);
  }
}

server.registerTool(
  "obsidian_health_check",
  {
    description:
      "Check whether Obsidian Local REST API is running and authenticated.",
    inputSchema: {},
    annotations: { readOnlyHint: true, idempotentHint: true }
  },
  async () => run(() => handlers.healthCheck())
);

server.registerTool(
  "obsidian_search_notes",
  {
    description:
      "Search managed Obsidian notes with built-in full-text search.",
    inputSchema: {
      query: z.string().min(1).describe("Search terms."),
      limit: z.number().int().min(1).max(50).default(10)
    },
    annotations: { readOnlyHint: true, idempotentHint: true }
  },
  async (input) => run(() => handlers.searchNotes(input))
);

server.registerTool(
  "obsidian_read_note",
  {
    description:
      "Read one managed Markdown note and return its SHA-256 concurrency hash.",
    inputSchema: { path: pathSchema },
    annotations: { readOnlyHint: true, idempotentHint: true }
  },
  async (input) => run(() => handlers.readNote(input))
);

server.registerTool(
  "obsidian_capture_inbox",
  {
    description:
      "Create a new governed capture under 01_Inbox without overwriting files.",
    inputSchema: {
      title: z.string().min(1),
      body: z.string(),
      confidentiality: confidentialitySchema
    },
    annotations: { readOnlyHint: false, destructiveHint: false }
  },
  async (input) => run(() => handlers.captureInbox(input))
);

server.registerTool(
  "obsidian_save_ai_draft",
  {
    description:
      "Create generated content under 40_Output/AI-Drafts for later review.",
    inputSchema: {
      title: z.string().min(1),
      body: z.string(),
      confidentiality: confidentialitySchema
    },
    annotations: { readOnlyHint: false, destructiveHint: false }
  },
  async (input) => run(() => handlers.saveAiDraft(input))
);

server.registerTool(
  "obsidian_validate_note",
  {
    description:
      "Validate a note's managed path and required frontmatter without modifying it.",
    inputSchema: { path: pathSchema },
    annotations: { readOnlyHint: true, idempotentHint: true }
  },
  async (input) => run(() => handlers.validateNote(input))
);

server.registerTool(
  "obsidian_promote_note",
  {
    description:
      "Move a valid Inbox or AI draft note into an allowed managed destination.",
    inputSchema: {
      source: pathSchema,
      destination: pathSchema,
      expectedHash: expectedHashSchema,
      destinationContent: z
        .string()
        .min(1)
        .describe(
          "Complete reviewed Markdown content for the destination, including valid frontmatter."
        )
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false
    }
  },
  async (input) => run(() => handlers.promoteNote(input))
);

server.registerTool(
  "obsidian_archive_note",
  {
    description:
      "Move a valid managed note into 50_Archive using hash-protected safe move.",
    inputSchema: {
      source: pathSchema,
      destination: pathSchema,
      expectedHash: expectedHashSchema
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false
    }
  },
  async (input) => run(() => handlers.archiveNote(input))
);

const transport = new StdioServerTransport();
await server.connect(transport);
