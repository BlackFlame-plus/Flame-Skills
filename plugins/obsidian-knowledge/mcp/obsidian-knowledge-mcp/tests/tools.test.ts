import { describe, expect, it, vi } from "vitest";
import { sha256 } from "../src/governance.js";
import {
  createToolHandlers,
  type KnowledgeClient
} from "../src/tools.js";

function fakeClient(overrides: Partial<KnowledgeClient> = {}): KnowledgeClient {
  return {
    health: vi.fn(async () => ({ authenticated: true })),
    search: vi.fn(async () => []),
    read: vi.fn(async () => ""),
    writeNew: vi.fn(async () => undefined),
    moveSafely: vi.fn(async (source, destination, hash) => ({
      source,
      destination,
      hash,
      state: "moved" as const
    })),
    ...overrides
  };
}

describe("knowledge tool handlers", () => {
  it("returns note content and a concurrency hash when reading", async () => {
    const content = "# Knowledge";
    const handlers = createToolHandlers(
      fakeClient({ read: vi.fn(async () => content) })
    );

    await expect(
      handlers.readNote({ path: "30_Knowledge/Test.md" })
    ).resolves.toEqual({
      path: "30_Knowledge/Test.md",
      content,
      hash: sha256(content)
    });
  });

  it("creates captures only in Inbox", async () => {
    const writeNew = vi.fn(async () => undefined);
    const handlers = createToolHandlers(fakeClient({ writeNew }));

    const result = await handlers.captureInbox({
      title: "新想法",
      body: "需要处理",
      confidentiality: "internal"
    });

    expect(result.path).toBe("01_Inbox/新想法.md");
    expect(writeNew).toHaveBeenCalledWith(
      "01_Inbox/新想法.md",
      expect.stringContaining("type: inbox")
    );
  });

  it("creates generated content only in AI-Drafts", async () => {
    const writeNew = vi.fn(async () => undefined);
    const handlers = createToolHandlers(fakeClient({ writeNew }));

    const result = await handlers.saveAiDraft({
      title: "研究报告",
      body: "待复核"
    });

    expect(result.path).toBe("40_Output/AI-Drafts/研究报告.md");
  });

  it("validates notes without mutating them", async () => {
    const content =
      '---\nid: "1"\ntype: knowledge\nstatus: active\ncreated: x\nupdated: x\nconfidentiality: internal\nai_index: true\nreviewed: true\n---\n';
    const client = fakeClient({ read: vi.fn(async () => content) });
    const handlers = createToolHandlers(client);

    await expect(
      handlers.validateNote({ path: "30_Knowledge/A.md" })
    ).resolves.toEqual({
      path: "30_Knowledge/A.md",
      hash: sha256(content),
      valid: true,
      issues: []
    });
    expect(client.moveSafely).not.toHaveBeenCalled();
    expect(client.writeNew).not.toHaveBeenCalled();
  });

  it("blocks promotion before mutation when metadata is invalid", async () => {
    const moveSafely = vi.fn();
    const handlers = createToolHandlers(
      fakeClient({
        read: vi.fn(async () => "---\ntype: inbox\n---\n"),
        moveSafely
      })
    );

    await expect(
      handlers.promoteNote({
        source: "01_Inbox/A.md",
        destination: "30_Knowledge/A.md",
        expectedHash: "hash",
        destinationContent: "---\ntype: knowledge\n---\n"
      })
    ).rejects.toThrow("validation");
    expect(moveSafely).not.toHaveBeenCalled();
  });

  it("promotes and archives through governed transitions", async () => {
    const sourceContent =
      '---\nid: "1"\ntype: inbox\nstatus: inbox\ncreated: x\nupdated: x\nconfidentiality: internal\nai_index: true\nreviewed: false\n---\n';
    const destinationContent =
      '---\nid: "knowledge-1"\ntype: knowledge\nstatus: active\ncreated: x\nupdated: x\nconfidentiality: internal\nai_index: true\nreviewed: true\n---\n# A\n';
    const moveSafely = vi.fn(async (source, destination, hash, writtenContent) => ({
      source,
      destination,
      hash: sha256(writtenContent ?? sourceContent),
      state: "moved" as const
    }));
    const handlers = createToolHandlers(
      fakeClient({ read: vi.fn(async () => sourceContent), moveSafely })
    );

    await handlers.promoteNote({
      source: "01_Inbox/A.md",
      destination: "30_Knowledge/A.md",
      expectedHash: sha256(sourceContent),
      destinationContent
    });
    await handlers.archiveNote({
      source: "30_Knowledge/A.md",
      destination: "50_Archive/30_Knowledge/A.md",
      expectedHash: sha256(sourceContent)
    });

    expect(moveSafely).toHaveBeenNthCalledWith(
      1,
      "01_Inbox/A.md",
      "30_Knowledge/A.md",
      sha256(sourceContent),
      destinationContent
    );
    expect(moveSafely).toHaveBeenNthCalledWith(
      2,
      "30_Knowledge/A.md",
      "50_Archive/30_Knowledge/A.md",
      sha256(sourceContent),
      expect.stringContaining("status: archived")
    );
  });
});
