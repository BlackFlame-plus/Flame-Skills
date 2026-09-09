# Conversation Knowledge Triage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AI clients automatically evaluate meaningful conversation milestones and save every qualifying atomic knowledge candidate as an unreviewed AI Brain draft.

**Architecture:** A canonical Vault policy defines scoring, exclusions, duplicate handling, and storage metadata. A client-agnostic Skill applies that policy using either workspace files or the governed Obsidian MCP; it never promotes conversation content directly into formal knowledge. Contract fixtures and a Node verification script keep the policy, template, Skill, plugin version, and unpublished-marketplace state aligned.

**Tech Stack:** Markdown, Obsidian YAML Properties, Claude/Cursor-compatible Skills, Node.js 20 built-ins, existing Obsidian Knowledge Tool MCP.

## Global Constraints

- Evaluate at meaningful milestones and at conversation end.
- Save atomic candidates, never full transcripts or one combined session dump.
- Save every candidate scoring at least 6 when novelty is greater than 0 and no exclusion applies.
- All accepted candidates go to `40_Output/AI-Drafts` with `reviewed: false` and `ai_index: false`.
- Never overwrite or directly modify formal knowledge.
- Never save passwords, API keys, tokens, cookies, or hidden chain-of-thought.
- Search before every write; duplicates are rejected or converted into update-review drafts.
- Keep the implementation client- and model-agnostic.
- Increase plugin version from `0.1.0` to `0.2.0`.
- Do not add the plugin to `.claude-plugin/marketplace.json` and do not push it to the remote marketplace.

---

### Task 1: Add Executable Contract Fixtures

**Files:**
- Create: `plugins/obsidian-knowledge-tool/tests/conversation-triage-cases.json`
- Create: `plugins/obsidian-knowledge-tool/tests/verify-conversation-triage.mjs`

**Interfaces:**
- Consumes: `AIBRAIN_VAULT_PATH` environment variable and repository-relative plugin files.
- Produces: a zero-exit verification command that checks required scenarios, metadata fields, trigger language, version `0.2.0`, and marketplace exclusion.

- [ ] **Step 1: Create the behavioral fixture file**

Create `plugins/obsidian-knowledge-tool/tests/conversation-triage-cases.json`:

```json
[
  {
    "id":"small-talk",
    "conversation":"用户：你好。AI：你好，有什么可以帮你？用户：谢谢。",
    "existingState":"",
    "expected":"reject",
    "candidateType":null
  },
  {
    "id":"confirmed-decision",
    "conversation":"用户确认：AI Brain 的正式知识只以 Markdown 为事实源，模型和客户端不得成为目录依赖。",
    "existingState":"",
    "expected":"save",
    "candidateType":"decision"
  },
  {
    "id":"mixed-conversation",
    "conversation":"前半段是寒暄。随后用户确认每周五复盘 AI 草稿，并总结出 MoE 总参数决定主要权重容量、活动参数主要影响计算量。",
    "existingState":"",
    "expected":"save-multiple",
    "candidateType":"knowledge"
  },
  {
    "id":"duplicate-conclusion",
    "conversation":"用户再次说明 Markdown 是 AI Brain 的唯一事实源。",
    "existingState":"30_Knowledge 中已有完全相同且已复核的结论。",
    "expected":"reject-duplicate",
    "candidateType":"knowledge"
  },
  {
    "id":"existing-note-new-evidence",
    "conversation":"NVIDIA 官方文档新增证据：MoE 每个 Token 只激活部分专家，但仍维护全部专家参数。",
    "existingState":"已有 MoE 选型知识笔记，但尚未引用 NVIDIA 官方文档。",
    "expected":"save-update-review",
    "candidateType":"knowledge"
  },
  {
    "id":"conflicting-conclusion",
    "conversation":"新测试显示当前备份无法恢复，与知识库中“备份已验证”的结论冲突。",
    "existingState":"现有正式笔记记录备份恢复验证通过。",
    "expected":"save-conflict-review",
    "candidateType":"knowledge"
  },
  {
    "id":"credential-present",
    "conversation":"临时 API Key 是 sk-secret-example。稍后删除即可。",
    "existingState":"",
    "expected":"reject-secret",
    "candidateType":null
  },
  {
    "id":"vault-unavailable",
    "conversation":"用户确认以后所有 AI 草稿必须记录实际模型名称。",
    "existingState":"Vault 搜索和写入接口不可用。",
    "expected":"report-unsaved",
    "candidateType":null
  },
  {
    "id":"multiple-candidates",
    "conversation":"用户决定先接入 Cursor；每周五复盘；稳定偏好是不要保存完整聊天记录。",
    "existingState":"",
    "expected":"save-multiple",
    "candidateType":"decision"
  },
  {
    "id":"superseded-plan",
    "conversation":"先计划使用本地 Ollama，随后用户明确放弃该方案，最终采用本地知识库加云端 AI。",
    "existingState":"",
    "expected":"reject-superseded-save-final",
    "candidateType":"decision"
  }
]
```

- [ ] **Step 2: Write the contract verifier before implementation**

Create `plugins/obsidian-knowledge-tool/tests/verify-conversation-triage.mjs`:

```javascript
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
  "ai_index: false"
]) {
  assert.ok(policy.includes(token), `policy missing ${token}`);
  assert.ok(template.includes(token), `template missing ${token}`);
  assert.ok(skill.includes(token), `skill missing ${token}`);
}

for (const boundary of ["40_Output/AI-Drafts", "never overwrite", "不得覆盖"]) {
  assert.ok(
    policy.includes(boundary) || skill.includes(boundary),
    `governance text missing ${boundary}`
  );
}

assert.match(policy, /at least 6|至少 6 分/);
assert.match(skill, /milestone|里程碑/);
assert.match(skill, /conversation end|会话结束/);
assert.equal(manifest.version, "0.2.0");
assert.ok(!marketplace.includes('"obsidian-knowledge-tool"'));

console.log("Conversation triage contract verified.");
```

- [ ] **Step 3: Run the verifier and confirm RED state**

Run:

```powershell
$env:AIBRAIN_VAULT_PATH = "D:\Obsidian\Local-AI-Brain"
node plugins/obsidian-knowledge-tool/tests/verify-conversation-triage.mjs
```

Expected: FAIL with `ENOENT` for
`00_System/Policies/Conversation-Knowledge-Triage.md`.

- [ ] **Step 4: Commit the contract fixtures**

```powershell
git add plugins/obsidian-knowledge-tool/tests
git commit -m "test: define conversation triage contract"
```

---

### Task 2: Add the Canonical Vault Policy and Candidate Template

**Files:**
- Create: `D:/Obsidian/Local-AI-Brain/00_System/Policies/Conversation-Knowledge-Triage.md`
- Create: `D:/Obsidian/Local-AI-Brain/00_System/Templates/Conversation-Knowledge-Candidate.md`
- Modify: `D:/Obsidian/Local-AI-Brain/00_System/Schemas/Properties-Schema.md`

**Interfaces:**
- Consumes: existing AI draft lifecycle and Properties Schema.
- Produces: the canonical scoring and storage contract referenced by all clients.

- [ ] **Step 1: Create the canonical policy**

Create `00_System/Policies/Conversation-Knowledge-Triage.md` with:

```markdown
---
id: policy-conversation-knowledge-triage
type: policy
status: active
created: 2026-09-09
updated: 2026-09-09
confidentiality: internal
ai_index: true
reviewed: true
---

# 会话知识自动评判

## 触发

AI 客户端在形成有意义的里程碑和会话结束时，评判尚未处理的对话片段。

## 原子候选

只提取 `decision`、`knowledge`、`project-update`、`action-item`、
`preference` 和 `context`。一条笔记只保存一个可独立复用的候选。

## 评分

分别对持久性、复用价值、影响、证据和新颖性评分 0 至 2 分。
总分至少 6 分、新颖性大于 0、未命中排除项且查重通过时自动保存。

## 排除

不保存闲聊、一次性指令、已被替代的计划、重复信息、隐藏推理、无长期价值的
猜测，以及密码、API Key、Token、Cookie 等凭据。

## 查重

写入前按标题、关键短语、项目、来源和主题搜索。完全重复则忽略；有新证据则
创建更新复核草稿；结论冲突则创建冲突复核草稿。不得覆盖已有笔记。

## 写入

所有候选只能写入 `40_Output/AI-Drafts`，并包含 `candidate_type`、
`capture_score`、`capture_reason`、`conversation_client`、
`conversation_captured_at` 和 `suggested_destination`。

候选必须保持 `reviewed: false` 和 `ai_index: false`。自动评判不构成人工复核，
不得直接晋升为正式知识。

## 失败

Vault 不可用、搜索失败或写入失败时，明确报告未保存，不得声称成功。
独立候选分别处理，一个失败不阻止其他候选继续评判。
```

- [ ] **Step 2: Create the conversation candidate template**

Create `00_System/Templates/Conversation-Knowledge-Candidate.md`:

```markdown
---
id: conversation-candidate-{{date:YYYYMMDDHHmmss}}
type: output
status: draft
created: {{date:YYYY-MM-DD}}
updated: {{date:YYYY-MM-DD}}
generated_at: {{date:YYYY-MM-DD}} {{time:HH:mm}}
model:
sources: []
project:
confidentiality: internal
ai_index: false
reviewed: false
candidate_type:
capture_score:
capture_reason:
conversation_client:
conversation_id:
conversation_title:
conversation_captured_at: {{date:YYYY-MM-DD}} {{time:HH:mm}}
suggested_destination:
tags: [ai/draft, conversation/candidate]
---

# {{title}}

> [!warning] 未复核的会话知识候选
> 该内容由 AI 自动评判并保存，晋升前必须人工核验。

## 候选结论

## 对话上下文

## 证据与来源

## 保存理由

## 建议归属

## 人工复核

- [ ] 结论准确
- [ ] 来源可追溯
- [ ] 不与现有知识重复
- [ ] Properties 与目标目录匹配
```

- [ ] **Step 3: Extend the optional Properties**

Append this section to `00_System/Schemas/Properties-Schema.md`:

```markdown
## 会话知识候选附加字段

- `candidate_type`：`decision`、`knowledge`、`project-update`、
  `action-item`、`preference` 或 `context`。
- `capture_score`：自动评判总分，范围 0 至 10。
- `capture_reason`：达到保存阈值的简短理由。
- `conversation_client`：产生对话的客户端名称。
- `conversation_id` / `conversation_title`：客户端能够提供时记录。
- `conversation_captured_at`：评判和保存时间。
- `suggested_destination`：人工复核后的建议目标目录。
```

- [ ] **Step 4: Validate the Vault**

Run:

```powershell
python "D:\Obsidian\Local-AI-Brain\00_System\Scripts\validate_vault.py" "D:\Obsidian\Local-AI-Brain"
```

Expected: `Vault validation passed`.

---

### Task 3: Implement the Client-Agnostic Triage Skill

**Files:**
- Create: `plugins/obsidian-knowledge-tool/skills/conversation-knowledge-triage/SKILL.md`
- Modify: `plugins/obsidian-knowledge-tool/skills/obsidian-knowledge-governance/SKILL.md`

**Interfaces:**
- Consumes: canonical Vault triage policy, workspace file tools or existing `obsidian_*` MCP tools.
- Produces: verified atomic notes under `40_Output/AI-Drafts`.

- [ ] **Step 1: Create the Skill**

Create `skills/conversation-knowledge-triage/SKILL.md` with this workflow:

```markdown
---
name: conversation-knowledge-triage
description: Evaluate conversation milestones and endings, then save durable atomic knowledge candidates to the governed AI Brain.
---

# Conversation Knowledge Triage

Read `00_System/Policies/Conversation-Knowledge-Triage.md`,
`00_System/Policies/Knowledge-Governance.md`, and
`00_System/Schemas/Properties-Schema.md` before evaluating.

Run at every meaningful milestone and at conversation end. Evaluate only the
conversation segment not already processed in the current session.

## Candidate extraction

Extract atomic `decision`, `knowledge`, `project-update`, `action-item`,
`preference`, and `context` candidates. Never save a full transcript or hidden
chain-of-thought.

## Scoring

Score durability, reuse, impact, evidence, and novelty from 0 to 2.
Save every candidate with a total of at least 6 when novelty is above 0 and no
exclusion applies. Record `capture_score` and `capture_reason`.

Reject small talk, one-off commands, superseded plans, unsupported low-value
speculation, duplicates, and credentials.

## Search and write

Search by title, distinctive phrases, project, sources, and topic before every
write. Reject exact duplicates. Save new evidence as an update-review draft and
conflicts as a conflict-review draft linked to the existing note.

Use `obsidian_save_ai_draft` when the governed MCP is available. Otherwise use
safe workspace file creation. Write only to `40_Output/AI-Drafts`; never
overwrite a file.

Every note must include `candidate_type`, `capture_score`, `capture_reason`,
`conversation_client`, `conversation_captured_at`, `suggested_destination`,
`reviewed: false`, and `ai_index: false`.

Re-read every created note and verify its path, Properties, content, and
sources. If the Vault, search, or write fails, report that the candidate was
not saved.

Finish with a compact result containing saved titles, rejected count, and
failures. Do not interrupt the user when no candidate qualifies.
```

- [ ] **Step 2: Link lifecycle governance to triage**

Append to `skills/obsidian-knowledge-governance/SKILL.md`:

```markdown
## Conversation candidates

For automatic milestone and conversation-end evaluation, use the
`conversation-knowledge-triage` Skill. Its accepted candidates remain ordinary
AI drafts and follow the same validation, review, promotion, and archive rules.
```

- [ ] **Step 3: Run a consistency search**

Run:

```powershell
rg -n "40_Output/AI-Drafts|reviewed: false|capture_score|at least 6" `
  plugins/obsidian-knowledge-tool/skills
```

Expected: both Skills reference the draft boundary, and the triage Skill
contains the threshold and metadata.

- [ ] **Step 4: Commit the Skill**

```powershell
git add plugins/obsidian-knowledge-tool/skills
git commit -m "feat: add conversation knowledge triage skill"
```

---

### Task 4: Register Automatic Evaluation in Vault Client Rules

**Files:**
- Modify: `D:/Obsidian/Local-AI-Brain/AGENTS.md`
- Modify: `D:/Obsidian/Local-AI-Brain/00_System/Integrations/AI-Client-Contract.md`
- Modify: `D:/Obsidian/Local-AI-Brain/Home.md`

**Interfaces:**
- Consumes: canonical policy and Skill behavior.
- Produces: milestone and session-end trigger instructions discoverable by
  workspace-based AI clients.

- [ ] **Step 1: Add the trigger to `AGENTS.md`**

Append:

```markdown
## Conversation knowledge triage

At meaningful milestones and before ending a substantial conversation, follow
`00_System/Policies/Conversation-Knowledge-Triage.md`.

Automatically save every qualifying atomic candidate to
`40_Output/AI-Drafts`. Search before writing, never save credentials, and never
promote these candidates without human review. If nothing qualifies, do not
interrupt the user.
```

- [ ] **Step 2: Extend the client contract**

Append to `00_System/Integrations/AI-Client-Contract.md`:

```markdown
## 会话结束评判

客户端在形成有意义的里程碑和会话结束时执行
[[00_System/Policies/Conversation-Knowledge-Triage|会话知识自动评判]]。

评判由客户端模型完成，存储仍使用工作区文件或受治理 MCP。达到阈值的候选全部
进入 `40_Output/AI-Drafts`；自动评判不得替代人工复核。
```

- [ ] **Step 3: Add navigation links**

Under `Home.md` → `AI Brain 系统`, add:

```markdown
- [[00_System/Policies/Conversation-Knowledge-Triage]]
```

Under `Home.md` → `工作流`, add:

```markdown
- [[00_System/Workflows/AI-Brain-Usage-Guide]]
```

- [ ] **Step 4: Validate links and lifecycle rules**

Run:

```powershell
python "D:\Obsidian\Local-AI-Brain\00_System\Scripts\validate_vault.py" "D:\Obsidian\Local-AI-Brain"
```

Expected: `Vault validation passed`.

---

### Task 5: Version and Document the Unpublished Plugin

**Files:**
- Modify: `plugins/obsidian-knowledge-tool/.claude-plugin/plugin.json`
- Modify: `plugins/obsidian-knowledge-tool/README.md`

**Interfaces:**
- Consumes: completed triage Skill.
- Produces: plugin version `0.2.0` and user-facing activation behavior.

- [ ] **Step 1: Increase the plugin version**

Change:

```json
"version": "0.1.0"
```

to:

```json
"version": "0.2.0"
```

- [ ] **Step 2: Document conversation triage**

Add to `plugins/obsidian-knowledge-tool/README.md`:

```markdown
## 会话知识自动评判

`conversation-knowledge-triage` Skill 在形成有意义的里程碑和会话结束时评判
对话。达到阈值的结论、决策、待办、偏好和项目更新会按原子条目自动保存到
`40_Output/AI-Drafts`。

该行为需要客户端主动调用 Skill 或遵循 Vault 的 `AGENTS.md`。Skill 本身不能
读取所有 AI 工具的私有历史记录，也不能保证不支持规则或 Hook 的客户端触发。
自动保存的内容保持 `reviewed: false`，必须人工复核后才能晋升。
```

- [ ] **Step 3: Commit version and documentation**

```powershell
git add plugins/obsidian-knowledge-tool/.claude-plugin/plugin.json `
  plugins/obsidian-knowledge-tool/README.md
git commit -m "docs: document automatic conversation triage"
```

---

### Task 6: Complete Behavioral and Regression Verification

**Files:**
- Verify: `plugins/obsidian-knowledge-tool/tests/conversation-triage-cases.json`
- Verify: `plugins/obsidian-knowledge-tool/tests/verify-conversation-triage.mjs`
- Verify: `plugins/obsidian-knowledge-tool/mcp/obsidian-knowledge-mcp/`
- Verify: `D:/Obsidian/Local-AI-Brain/`

**Interfaces:**
- Consumes: all completed implementation artifacts.
- Produces: evidence that the contract passes, the MCP is unchanged and healthy,
  the Vault remains valid, and the plugin is still unpublished.

- [ ] **Step 1: Run the contract verifier and confirm GREEN state**

Run:

```powershell
$env:AIBRAIN_VAULT_PATH = "D:\Obsidian\Local-AI-Brain"
node plugins/obsidian-knowledge-tool/tests/verify-conversation-triage.mjs
```

Expected: `Conversation triage contract verified.`

- [ ] **Step 2: Test the Skill with a fresh-context evaluator**

Provide only the Skill, canonical policy, and each fixture scenario to a fresh
agent. Ask it to return proposed actions without performing file writes.
Confirm these outcomes:

```text
small-talk -> no save
confirmed-decision -> one decision draft
mixed-conversation -> only durable atomic candidates
duplicate-conclusion -> no save
existing-note-new-evidence -> update-review draft
conflicting-conclusion -> conflict-review draft
credential-present -> credential excluded and no credential-bearing draft
vault-unavailable -> explicit unsaved result
multiple-candidates -> multiple independent drafts
superseded-plan -> reject the abandoned plan and save only the final decision
```

- [ ] **Step 3: Run MCP regression checks**

Run:

```powershell
Set-Location plugins/obsidian-knowledge-tool/mcp/obsidian-knowledge-mcp
npm test
npm run build
npm run smoke
```

Expected: all Vitest tests pass, TypeScript/build completes, and smoke reports
the MCP tool list and healthy protocol exchange.

- [ ] **Step 4: Run final Vault validation**

Run:

```powershell
python "D:\Obsidian\Local-AI-Brain\00_System\Scripts\validate_vault.py" "D:\Obsidian\Local-AI-Brain"
```

Expected: `Vault validation passed`.

- [ ] **Step 5: Verify repository cleanliness and marketplace exclusion**

Run:

```powershell
git diff --check
git status --short
rg -n '"obsidian-knowledge-tool"' .claude-plugin/marketplace.json
```

Expected:

- `git diff --check` prints nothing.
- Only intended implementation files are modified or newly added before the
  final commit.
- `rg` returns no match.

