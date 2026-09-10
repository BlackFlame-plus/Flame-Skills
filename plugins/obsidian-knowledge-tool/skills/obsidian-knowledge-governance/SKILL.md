---
name: obsidian-knowledge-governance
description: Governed workflow for capturing, validating, promoting, and archiving Obsidian knowledge.
---

# Obsidian Knowledge Governance

Use the `obsidian_*` MCP tools for every interaction with the managed vault.
Never call the Local REST API directly or attempt unrestricted writes,
overwrites, deletes, Obsidian commands, or attachment uploads.

## Lifecycle

1. Capture unclassified material with `obsidian_capture_inbox`.
2. Classify the note and choose an allowed destination.
3. Run `obsidian_validate_note` before any promotion or archive.
4. Read the source immediately before moving it and retain the returned hash.
5. Rewrite the note into the destination template. Preserve the source
   evidence, set destination-appropriate `type` and `status`, and set
   `reviewed: true` only after human review.
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
`30_Knowledge` require `type: knowledge`; notes promoted into non-draft
`40_Output` require `type: output`.

## Conversation candidates

For automatic milestone and conversation-end evaluation, use the
`conversation-knowledge-triage` Skill. Its accepted candidates remain ordinary
AI drafts and follow the same validation, review, promotion, and archive rules.
