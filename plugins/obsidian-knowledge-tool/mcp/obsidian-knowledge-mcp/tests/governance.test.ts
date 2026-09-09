import { describe, expect, it } from "vitest";
import {
  assertReadablePath,
  assertTransition,
  createManagedNote,
  normalizeVaultPath,
  parseFrontmatter,
  sha256,
  updateFrontmatter,
  validateNote
} from "../src/governance.js";

describe("vault path governance", () => {
  it("normalizes separators and rejects traversal or absolute paths", () => {
    expect(normalizeVaultPath("30_Knowledge\\AI\\RAG.md")).toBe(
      "30_Knowledge/AI/RAG.md"
    );
    expect(() => normalizeVaultPath("../secret.md")).toThrow("relative");
    expect(() => normalizeVaultPath("D:/secret.md")).toThrow("relative");
  });

  it("allows managed Markdown reads but rejects attachments and config", () => {
    expect(assertReadablePath("10_Projects/Alpha.md")).toBe(
      "10_Projects/Alpha.md"
    );
    expect(() => assertReadablePath("90_Attachments/file.pdf")).toThrow(
      "Markdown"
    );
    expect(() => assertReadablePath(".obsidian/app.json")).toThrow(
      "managed"
    );
  });

  it("enforces promotion and archive transitions", () => {
    expect(
      assertTransition("01_Inbox/idea.md", "30_Knowledge/idea.md")
    ).toEqual({
      source: "01_Inbox/idea.md",
      destination: "30_Knowledge/idea.md",
      kind: "promote"
    });
    expect(
      assertTransition(
        "40_Output/AI-Drafts/report.md",
        "40_Output/Reports/report.md"
      )
    ).toMatchObject({ kind: "promote" });
    expect(
      assertTransition(
        "10_Projects/Alpha.md",
        "50_Archive/10_Projects/Alpha.md"
      )
    ).toMatchObject({ kind: "archive" });
    expect(() =>
      assertTransition("30_Knowledge/a.md", "20_Areas/a.md")
    ).toThrow("transition");
    expect(() =>
      assertTransition("01_Inbox/a.md", "00_System/a.md")
    ).toThrow("destination");
  });
});

describe("managed note metadata", () => {
  it("creates deterministic Inbox notes with required frontmatter", () => {
    const note = createManagedNote({
      kind: "inbox",
      title: "MCP / 知识管理",
      body: "正文",
      now: new Date("2026-09-09T10:00:00.000Z")
    });

    expect(note.path).toBe("01_Inbox/MCP - 知识管理.md");
    expect(parseFrontmatter(note.content)).toMatchObject({
      id: "inbox-20260909100000",
      type: "inbox",
      status: "inbox",
      confidentiality: "internal",
      ai_index: true,
      reviewed: false
    });
    expect(validateNote(note.content, note.path)).toEqual([]);
  });

  it("creates AI drafts only below the AI-Drafts folder", () => {
    const note = createManagedNote({
      kind: "ai-draft",
      title: "周报",
      body: "草稿",
      now: new Date("2026-09-09T10:00:00.000Z")
    });
    expect(note.path).toBe("40_Output/AI-Drafts/周报.md");
    expect(parseFrontmatter(note.content)).toMatchObject({
      id: "ai-draft-20260909100000",
      type: "output",
      status: "draft",
      ai_index: false,
      reviewed: false
    });
  });

  it("updates lifecycle properties without replacing note content", () => {
    const updated = updateFrontmatter(
      "---\ntype: knowledge\nstatus: active\nreviewed: true\n---\n\n# A\n\nBody\n",
      { status: "archived", updated: "2026-09-09" }
    );
    expect(parseFrontmatter(updated)).toMatchObject({
      type: "knowledge",
      status: "archived",
      reviewed: true,
      updated: "2026-09-09"
    });
    expect(updated).toContain("# A\n\nBody");
  });

  it("reports missing required metadata", () => {
    const issues = validateNote(
      "---\ntype: knowledge\n---\n# Broken",
      "30_Knowledge/Broken.md"
    );
    expect(issues).toContain("Missing required property: id");
    expect(issues).toContain("Missing required property: status");
  });

  it("hashes content deterministically", () => {
    expect(sha256("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });
});
