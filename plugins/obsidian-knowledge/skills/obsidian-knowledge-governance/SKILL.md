---
name: obsidian-knowledge-governance
description: Governed workflow for capturing, validating, promoting, and archiving Obsidian knowledge.
---

# Obsidian Knowledge Governance

## MCP 铁律（不可跳过）

**必须必须必须**使用本插件内置的 `obsidian_*` MCP 工具管理 vault。
禁止跳过 MCP；禁止直连 Local REST API；禁止用 Shell/`Write`/`Edit`
等任意旁路读写 vault。

若 MCP 未配置、未启用、调用失败或缺少 `api_url` / `api_key`：
**立刻向用户索要配置并停手**，不得自行猜测、硬编码密钥、改写路径绕过，
也不得改用本地文件系统「凑合完成」。

Never attempt unrestricted writes, overwrites, deletes, Obsidian commands,
or attachment uploads outside these tools.

## Lifecycle

1. Capture unclassified material with `obsidian_capture_inbox`.
2. Classify the note and choose an allowed destination.
3. Run `obsidian_validate_note` before any promotion or archive.
4. Read the source immediately before moving it and retain the returned hash.
5. Rewrite the note into the destination template. Preserve the source
   evidence, set destination-appropriate `type` and `status`, and set
   `reviewed: true` after human review **or** after conversation triage
   auto-promotion (`auto_promoted: true` per Vault policy).
6. Promote with `obsidian_promote_note`, supplying the source hash and the
   complete reviewed destination Markdown as `destinationContent`.
7. Archive eligible material with `obsidian_archive_note`, again supplying the
   latest source hash.

AI-generated content starts with `obsidian_save_ai_draft` under
`40_Output/AI-Drafts`. Captures start under `01_Inbox`. Promotion destinations
are limited to `10_Projects`, `20_Areas`, `30_Knowledge`, and non-draft
`40_Output` paths. Archive destinations are limited to `50_Archive`.

Treat a stale hash, validation issue, or destination conflict as a stop
condition. Re-read and re-validate rather than bypassing the check. If a move
reports a duplicate state, preserve both files and ask a human to reconcile
them; never delete the destination as recovery.

The server changes archived notes to `status: archived`. Notes promoted into
`30_Knowledge` require `type: knowledge` or `type: decision`; notes promoted
into `10_Projects` require `type: project`; notes promoted into non-draft
`40_Output` require `type: output`.

## Conversation candidates

For automatic milestone and conversation-end evaluation, use the
`conversation-knowledge-triage` Skill. Qualifying non-conflict candidates are
drafted then auto-promoted per Vault triage policy.
