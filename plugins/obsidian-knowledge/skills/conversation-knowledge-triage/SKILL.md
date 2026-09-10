---
name: conversation-knowledge-triage
description: Evaluate conversation milestones and endings, then save and auto-promote durable atomic knowledge candidates in the governed AI Brain.
---

# Conversation Knowledge Triage

## MCP 铁律（不可跳过）

**必须必须必须**使用本插件内置的 `obsidian_*` MCP 完成检索、草稿、校验、
晋升；禁止跳过 MCP，禁止用 Shell/`Write`/`Edit` 或直连 Local REST API
写入 vault。

若 MCP 未配置、未启用、调用失败或缺少 `api_url` / `api_key`：
**立刻向用户索要配置并停手**，不得本地落盘「凑合保存」，不得硬编码密钥。

Read `00_System/Policies/Conversation-Knowledge-Triage.md`,
`00_System/Policies/Knowledge-Governance.md`, and
`00_System/Schemas/Properties-Schema.md` before evaluating（通过
`obsidian_*` MCP 读取，不得旁路）。

Run at every meaningful milestone and at conversation end. Evaluate only the
conversation segment not already processed in the current session.

## Candidate extraction

Extract atomic `decision`, `knowledge`, `project-update`, `action-item`,
`preference`, and `context` candidates. Never save a full transcript or hidden
chain-of-thought.

## Scoring

Score durability, reuse, impact, evidence, and novelty from 0 to 2.
Qualify every candidate with a total of at least 6 when novelty is above 0 and
no exclusion applies. Record `capture_score` and `capture_reason`.

Reject small talk, one-off commands, superseded plans, unsupported low-value
speculation, duplicates, and credentials.

## Search, draft, and auto-promote

Search by title, distinctive phrases, project, sources, and topic before every
write. Reject exact duplicates. Save new evidence as an update-review draft and
conflicts as a conflict-review draft linked to the existing note. Never
overwrite a file.

1. **必须**调用 `obsidian_save_ai_draft` 创建草稿。MCP 不可用时停手并向
   用户要配置；禁止在 `40_Output/AI-Drafts` 本地旁路建文件。
2. Every draft must include `candidate_type`, `capture_score`, `capture_reason`,
   `conversation_client`, `conversation_captured_at`, `suggested_destination`,
   `reviewed: false`, and `ai_index: false` at create time.
3. **Auto-promote (policy C):** for each qualifying non-conflict candidate
   (all candidate types; score ≥ 6; novelty > 0):
   - Re-read the draft via MCP and keep its content hash.
   - Build destination Markdown with destination-appropriate `type` /
     `status: active`, `reviewed: true`, `auto_promoted: true`,
     `ai_index: true`, and preserved sources / capture fields.
   - Destination map:
     - `knowledge` / `preference` / `context` / `action-item` → `30_Knowledge/`
       (`type: knowledge`)
     - `decision` → `30_Knowledge/` (`type: decision`)
     - `project-update` → `10_Projects/` (`type: project`)
   - **必须**调用 `obsidian_promote_note` with the draft hash and full
     `destinationContent`.
4. Conflict-review drafts stay in `AI-Drafts` with `reviewed: false`; do not
   auto-promote them.

Re-read every created or promoted note via MCP and verify path, Properties,
content, and sources. If Vault/MCP search, write, or promote fails: stop,
ask the user for configuration when that is the cause, and report that the
candidate was not completed. Never bypass MCP to finish the write.

Finish with a compact result containing saved titles, auto-promoted paths,
rejected count, and failures. Do not interrupt the user when no candidate
qualifies.
