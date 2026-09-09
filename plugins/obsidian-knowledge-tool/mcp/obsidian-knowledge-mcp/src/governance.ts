import { createHash } from "node:crypto";
import path from "node:path";

const READ_ROOTS = new Set([
  "00_System",
  "01_Inbox",
  "10_Projects",
  "20_Areas",
  "30_Knowledge",
  "40_Output",
  "50_Archive"
]);
const PROMOTION_ROOTS = new Set([
  "10_Projects",
  "20_Areas",
  "30_Knowledge",
  "40_Output"
]);
const ARCHIVABLE_ROOTS = new Set([
  "01_Inbox",
  "10_Projects",
  "20_Areas",
  "30_Knowledge",
  "40_Output"
]);
const REQUIRED_PROPERTIES = [
  "id",
  "type",
  "status",
  "created",
  "updated",
  "confidentiality",
  "ai_index",
  "reviewed"
] as const;

export type ManagedNoteKind = "inbox" | "ai-draft";

export interface CreateManagedNoteInput {
  kind: ManagedNoteKind;
  title: string;
  body: string;
  confidentiality?: "public" | "internal" | "confidential" | "secret";
  now?: Date;
}

export interface ManagedNote {
  path: string;
  content: string;
  hash: string;
}

export interface Transition {
  source: string;
  destination: string;
  kind: "promote" | "archive";
}

function rootOf(vaultPath: string): string {
  return vaultPath.split("/")[0] ?? "";
}

function isAiDraft(vaultPath: string): boolean {
  return vaultPath.startsWith("40_Output/AI-Drafts/");
}

export function normalizeVaultPath(input: string): string {
  const value = input.trim().replaceAll("\\", "/");
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    /^[A-Za-z]:\//.test(value)
  ) {
    throw new Error("Vault path must be a non-empty relative path.");
  }

  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error("Vault path must be relative and cannot contain traversal.");
  }

  return segments.join("/");
}

export function assertReadablePath(input: string): string {
  const normalized = normalizeVaultPath(input);
  if (rootOf(normalized).startsWith(".")) {
    throw new Error("Path is outside the managed knowledge folders.");
  }
  if (!normalized.toLowerCase().endsWith(".md")) {
    throw new Error("Only Markdown notes can be read.");
  }
  if (!READ_ROOTS.has(rootOf(normalized))) {
    throw new Error("Path is outside the managed knowledge folders.");
  }
  return normalized;
}

export function assertTransition(
  sourceInput: string,
  destinationInput: string
): Transition {
  const source = assertReadablePath(sourceInput);
  const destination = assertReadablePath(destinationInput);
  const sourceRoot = rootOf(source);
  const destinationRoot = rootOf(destination);

  if (destinationRoot === "50_Archive") {
    if (!ARCHIVABLE_ROOTS.has(sourceRoot) || sourceRoot === "50_Archive") {
      throw new Error("Source is not eligible for an archive transition.");
    }
    return { source, destination, kind: "archive" };
  }

  if (!PROMOTION_ROOTS.has(destinationRoot) || isAiDraft(destination)) {
    throw new Error("Promotion destination is not allowed.");
  }
  if (sourceRoot !== "01_Inbox" && !isAiDraft(source)) {
    throw new Error("Source is not eligible for a promotion transition.");
  }

  return { source, destination, kind: "promote" };
}

function parseScalar(raw: string): string | boolean | number | null {
  const value = raw.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseFrontmatter(
  content: string
): Record<string, string | boolean | number | null> {
  const normalized = content.replaceAll("\r\n", "\n");
  if (!normalized.startsWith("---\n")) return {};
  const end = normalized.indexOf("\n---", 4);
  if (end < 0) return {};

  const result: Record<string, string | boolean | number | null> = {};
  for (const line of normalized.slice(4, end).split("\n")) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    result[key] = parseScalar(line.slice(separator + 1));
  }
  return result;
}

export function validateNote(content: string, vaultPath: string): string[] {
  const issues: string[] = [];
  try {
    assertReadablePath(vaultPath);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
  }

  const properties = parseFrontmatter(content);
  for (const property of REQUIRED_PROPERTIES) {
    if (!(property in properties) || properties[property] === "") {
      issues.push(`Missing required property: ${property}`);
    }
  }
  return issues;
}

function dateParts(date: Date): { id: string; date: string; generatedAt: string } {
  const iso = date.toISOString();
  return {
    id: iso.replace(/\D/g, "").slice(0, 14),
    date: iso.slice(0, 10),
    generatedAt: iso
  };
}

function serializeScalar(value: string | boolean | number | null): string {
  if (typeof value === "string") return value;
  return String(value);
}

export function updateFrontmatter(
  content: string,
  updates: Record<string, string | boolean | number | null>
): string {
  const normalized = content.replaceAll("\r\n", "\n");
  if (!normalized.startsWith("---\n")) {
    throw new Error("Cannot update a note without YAML frontmatter.");
  }
  const end = normalized.indexOf("\n---", 4);
  if (end < 0) throw new Error("Cannot update malformed YAML frontmatter.");

  const lines = normalized.slice(4, end).split("\n");
  for (const [key, value] of Object.entries(updates)) {
    const index = lines.findIndex(
      (line) => line.slice(0, line.indexOf(":")).trim() === key
    );
    const replacement = `${key}: ${serializeScalar(value)}`;
    if (index >= 0) lines[index] = replacement;
    else lines.push(replacement);
  }
  return `---\n${lines.join("\n")}\n---${normalized.slice(end + 4)}`;
}

function safeFilename(title: string): string {
  const filename = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " - ")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "");
  if (!filename) throw new Error("Title must produce a non-empty filename.");
  return filename;
}

export function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function createManagedNote(input: CreateManagedNoteInput): ManagedNote {
  const now = input.now ?? new Date();
  const { id, date, generatedAt } = dateParts(now);
  const folder =
    input.kind === "inbox" ? "01_Inbox" : "40_Output/AI-Drafts";
  const isInbox = input.kind === "inbox";
  const type = isInbox ? "inbox" : "output";
  const status = isInbox ? "inbox" : "draft";
  const filename = safeFilename(input.title);
  const vaultPath = path.posix.join(folder, `${filename}.md`);
  const frontmatter = [
    "---",
    `id: "${isInbox ? "inbox" : "ai-draft"}-${id}"`,
    `type: ${type}`,
    `status: ${status}`,
    `created: ${date}`,
    `updated: ${date}`,
    ...(isInbox ? [] : [`generated_at: ${generatedAt}`, "model:", "sources: []"]),
    "source:",
    "project:",
    `confidentiality: ${input.confidentiality ?? "internal"}`,
    `ai_index: ${isInbox ? "true" : "false"}`,
    "reviewed: false",
    `tags: ${isInbox ? "[]" : "[ai/draft]"}`,
    "---",
    ""
  ];
  const body = isInbox
    ? [
        `# ${input.title.trim()}`,
        "",
        "## 原始内容",
        "",
        input.body.trim(),
        "",
        "## 为什么值得保存",
        "",
        "## 下一步",
        "",
        "- [ ] 删除 / 归档 / 转项目 / 提炼知识",
        ""
      ]
    : [
        `# ${input.title.trim()}`,
        "",
        "> [!warning] 未复核的 AI 草稿",
        "> 不得作为事实或决策依据。复核时逐条检查来源、数字、日期与专有名词。",
        "",
        "## 草稿",
        "",
        input.body.trim(),
        "",
        "## 来源",
        "",
        "## 人工复核记录",
        ""
      ];
  const content = [...frontmatter, ...body].join("\n");

  return { path: vaultPath, content, hash: sha256(content) };
}
