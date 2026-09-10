---
name: conversation-knowledge-triage
description: Evaluate conversation milestones and endings, then save and auto-promote durable atomic knowledge candidates in the governed AI Brain.
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
Qualify every candidate with a total of at least 6 when novelty is above 0 and
no exclusion applies. Record `capture_score` and `capture_reason`.

Reject small talk, one-off commands, superseded plans, unsupported low-value
speculation, duplicates, and credentials.

## Search, draft, and auto-promote

Search by title, distinctive phrases, project, sources, and topic before every
write. Reject exact duplicates. Save new evidence as an update-review draft and
conflicts as a conflict-review draft linked to the existing note. Never
overwrite a file.

1. Use `obsidian_save_ai_draft` when the governed MCP is available (otherwise
   safe workspace creation under `40_Output/AI-Drafts`).
2. Every draft must include `candidate_type`, `capture_score`, `capture_reason`,
   `conversation_client`, `conversation_captured_at`, `suggested_destination`,
   `reviewed: false`, and `ai_index: false` at create time.
3. **Auto-promote (policy C):** for each qualifying non-conflict candidate
   (all candidate types; score ≥ 6; novelty > 0):
   - Re-read the draft and keep its content hash.
   - Build destination Markdown with destination-appropriate `type` /
     `status: active`, `reviewed: true`, `auto_promoted: true`,
     `ai_index: true`, and preserved sources / capture fields.
   - Destination map:
     - `knowledge` / `preference` / `context` / `action-item` → `30_Knowledge/`
       (`type: knowledge`)
     - `decision` → `30_Knowledge/` (`type: decision`)
     - `project-update` → `10_Projects/` (`type: project`)
   - Call `obsidian_promote_note` with the draft hash and full
     `destinationContent`.
4. Conflict-review drafts stay in `AI-Drafts` with `reviewed: false`; do not
   auto-promote them.

Re-read every created or promoted note and verify path, Properties, content,
and sources. If Vault, search, write, or promote fails, report that the
candidate was not completed.

Finish with a compact result containing saved titles, auto-promoted paths,
rejected count, and failures. Do not interrupt the user when no candidate
qualifies.
