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
safe workspace file creation. Write only to `40_Output/AI-Drafts`; never overwrite
a file.

Every note must include `candidate_type`, `capture_score`, `capture_reason`,
`conversation_client`, `conversation_captured_at`, `suggested_destination`,
`reviewed: false`, and `ai_index: false`.

Re-read every created note and verify its path, Properties, content, and
sources. If the Vault, search, or write fails, report that the candidate was
not saved.

Finish with a compact result containing saved titles, rejected count, and
failures. Do not interrupt the user when no candidate qualifies.
