import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(here, "..");
const repoRoot = path.resolve(pluginRoot, "..", "..");
const vaultRoot = process.env.AIBRAIN_VAULT_PATH;

assert.ok(vaultRoot, "AIBRAIN_VAULT_PATH is required");

const read = (file) => readFile(file, "utf8");
const fixtures = JSON.parse(
  await read(path.join(here, "conversation-triage-cases.json"))
);
const requiredCases = [
  "small-talk",
  "confirmed-decision",
  "mixed-conversation",
  "duplicate-conclusion",
  "existing-note-new-evidence",
  "conflicting-conclusion",
  "credential-present",
  "vault-unavailable",
  "multiple-candidates",
  "superseded-plan"
];
assert.deepEqual(fixtures.map((item) => item.id), requiredCases);
for (const fixture of fixtures) {
  assert.equal(typeof fixture.conversation, "string");
  assert.ok(fixture.conversation.length > 0);
  assert.equal(typeof fixture.existingState, "string");
  assert.equal(typeof fixture.expected, "string");
}

const policy = await read(
  path.join(vaultRoot, "00_System", "Policies", "Conversation-Knowledge-Triage.md")
);
const template = await read(
  path.join(vaultRoot, "00_System", "Templates", "Conversation-Knowledge-Candidate.md")
);
const skill = await read(
  path.join(pluginRoot, "skills", "conversation-knowledge-triage", "SKILL.md")
);
const manifest = JSON.parse(
  await read(path.join(pluginRoot, ".claude-plugin", "plugin.json"))
);
const marketplace = await read(
  path.join(repoRoot, ".claude-plugin", "marketplace.json")
);

for (const token of [
  "capture_score",
  "capture_reason",
  "candidate_type",
  "conversation_client",
  "reviewed: false",
  "ai_index: false",
  "auto_promoted"
]) {
  assert.ok(policy.includes(token), `policy missing ${token}`);
  assert.ok(
    template.includes(token) || token === "auto_promoted",
    `template missing ${token}`
  );
  assert.ok(skill.includes(token), `skill missing ${token}`);
}

assert.ok(template.includes("auto_promoted"));
assert.ok(policy.includes("自动晋升") || policy.includes("auto-promote"));
assert.ok(skill.includes("Auto-promote") || skill.includes("auto-promote"));

for (const boundary of ["40_Output/AI-Drafts", "never overwrite", "不得覆盖"]) {
  assert.ok(
    policy.includes(boundary) || skill.includes(boundary),
    `governance text missing ${boundary}`
  );
}

assert.match(policy, /at least 6|至少 6 分/);
assert.match(skill, /milestone|里程碑/);
assert.match(skill, /conversation end|会话结束/);
assert.equal(manifest.version, "0.4.0");
assert.ok(marketplace.includes('"obsidian-knowledge"'));
assert.ok(marketplace.includes('"version": "0.4.0"'));

console.log("Conversation triage contract verified.");
