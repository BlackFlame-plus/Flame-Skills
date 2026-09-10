# Conversation Knowledge Triage Design

## Goal

Add a client-agnostic workflow that lets an AI decide whether durable knowledge
emerged from a conversation and automatically save every qualifying atomic
candidate to the AI Brain.

The first version defines a shared rule and Skill. Each AI client invokes the
workflow when a meaningful conclusion is formed and when a conversation ends.
The workflow does not depend on a specific model, conversation storage format,
or client transcript API.

## Confirmed Product Decisions

- Start with a generic rule that AI clients invoke, rather than a
  client-specific transcript collector.
- Evaluate at meaningful milestones and at conversation end.
- Automatically save every candidate that reaches the threshold.
- Save atomic conclusions, decisions, tasks, preferences, and project updates;
  do not save full transcripts or one large session summary.
- Save all accepted candidates as unreviewed AI drafts. Human review remains
  mandatory before formal knowledge promotion.

## Scope

V1 adds:

- A Vault policy describing the evaluation rubric and write boundaries.
- A reusable note template for conversation-derived candidates.
- A plugin Skill that any capable AI client can follow.
- Client-contract instructions requiring milestone and session-end evaluation.
- Fixtures or documented examples covering save, reject, mixed, and duplicate
  outcomes.

V1 does not add:

- Automatic access to every client's private transcript database.
- A background watcher, scheduled transcript importer, or operating-system
  service.
- Automatic promotion into Projects, Areas, Knowledge, Articles, or Reports.
- Direct modification of existing formal notes.
- A second model call dedicated to classification.
- A new MCP tool. The existing governed draft-creation capability is sufficient
  for clients that already use MCP.

## Architecture

```text
Conversation in any AI client
  -> milestone or session-end trigger
  -> conversation triage Skill
  -> atomic candidate extraction
  -> deterministic rubric
  -> Vault search and duplicate check
  -> accepted candidates
  -> 40_Output/AI-Drafts
  -> later human review and normal promotion workflow
```

The client model performs semantic evaluation because the MCP server does not
contain an inference engine. MCP or workspace-file access performs governed
search and creation. This separates judgment from storage enforcement:

- The Skill decides what is worth retaining.
- Vault policies define the shared business rules.
- MCP or filesystem tools enforce where accepted candidates may be written.
- Humans decide whether a candidate becomes formal knowledge.

## Trigger Contract

Clients run the evaluation at two points:

1. **Meaningful milestone**: the conversation produces a confirmed decision,
   reusable solution, durable preference, material project-state change, or
   source-backed conclusion.
2. **Conversation end**: before finishing a substantial session, evaluate the
   unsaved portion of the conversation.

The client tracks the last evaluated point within its current context when
possible. Re-evaluating the same content is safe because duplicate detection is
required before writing.

A Skill alone cannot force every AI application to expose lifecycle events.
Clients without rules, hooks, or agent instructions only gain this behavior
when they actively invoke the Skill. V1 standardizes behavior; client adapters
may improve trigger reliability later.

## Atomic Candidate Types

Each saved note contains exactly one durable item of one of these kinds:

- `decision`: a choice the user confirmed, including rationale and impact.
- `knowledge`: a reusable principle, explanation, or verified finding.
- `project-update`: a material status change, blocker, milestone, or next step.
- `action-item`: a concrete commitment with enough context to act later.
- `preference`: a stable user preference that should influence future work.
- `context`: durable background information needed across future sessions.

If a conversation contains multiple qualifying items, the client creates
multiple atomic drafts. Closely related evidence may remain in one note when
splitting it would remove necessary context.

## Evaluation Rubric

Score each candidate from 0 to 10:

| Dimension | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Durability | Relevant only now | Useful for days or one task | Useful across future sessions |
| Reuse | No likely reuse | One likely reuse | Repeated or broad reuse |
| Impact | No action or decision impact | Helpful context | Changes decisions, commitments, or project state |
| Evidence | Unsupported inference | Conversation evidence only | Source, artifact, test, or explicit user confirmation |
| Novelty | Duplicate | Partial update | New information |

Save a candidate when all conditions are true:

- Total score is at least 6.
- Novelty is greater than 0.
- The candidate is not covered by an existing note or an earlier candidate from
  the same conversation.
- It is not excluded by the rules below.

The saved note records the total score and a short reason. A high score does
not permit direct promotion; every saved candidate remains `reviewed: false`.

## Always Reject

Do not save:

- Greetings, small talk, acknowledgements, or conversational filler.
- One-off commands whose result is already represented by changed files.
- Intermediate plans that were replaced before the task ended.
- Raw chain-of-thought or hidden reasoning.
- Repeated information with no material update.
- Unverified speculation that has no durable decision value.
- Passwords, API keys, tokens, session cookies, or other credentials.
- Full transcripts when an atomic conclusion can preserve the useful content.

If unsupported information still matters as a decision risk, save the
uncertainty or open question rather than presenting the claim as fact.

## Duplicate Handling

Before every write, search by:

- Candidate title and distinctive key phrases.
- Related project, source, and internal links.
- Candidate type and topic.

Handle matches as follows:

- **Same meaning, no new evidence**: reject as duplicate.
- **Same meaning, new evidence**: create a draft proposing an update and link
  the existing note; do not overwrite it.
- **Conflicting conclusion**: create a conflict-review draft containing both
  claims and their evidence.
- **Same title, different meaning**: generate a disambiguated filename.

## Storage Contract

Every accepted candidate is created under `40_Output/AI-Drafts` with the
standard AI-draft Properties plus:

```yaml
candidate_type: decision
capture_score: 8
capture_reason: "Confirmed architecture decision with future project impact."
conversation_client: cursor
conversation_id:
conversation_title:
conversation_captured_at: 2026-09-09T21:38:00+08:00
suggested_destination: 10_Projects
```

Required existing fields remain:

```yaml
type: output
status: draft
ai_index: false
reviewed: false
generated_at:
model:
sources: []
```

`conversation_id` and `conversation_title` are optional because not every
client exposes them. When unavailable, the client records its name, timestamp,
and any relevant file, URL, or Wikilink sources.

The note body contains:

1. Candidate statement.
2. Context.
3. Evidence and sources.
4. Why the item was saved.
5. Suggested destination.
6. Human-review checklist.

## Write and Failure Rules

- Never write conversation-derived content directly into formal directories.
- Never overwrite an existing file.
- Re-read or search after writing to verify path, Properties, and content.
- If the Vault or MCP is unavailable, show the candidate in the current
  conversation and state that it was not saved.
- If search fails, do not claim duplicate checking succeeded.
- If creation conflicts with an existing filename, use a disambiguated name;
  never delete the destination.
- A failed candidate must not prevent other independent candidates from being
  evaluated, but the final response must list every failed save.

## Skill Behavior

The Skill instructs the client to:

1. Identify the unevaluated conversation segment.
2. Extract atomic candidate statements.
3. Apply exclusions and score the rubric.
4. Search the Vault for every passing candidate.
5. Reject duplicates or convert new evidence into update-review drafts.
6. Save all remaining candidates to `40_Output/AI-Drafts`.
7. Verify every created note.
8. Report only a compact result: saved titles, rejected count, and failures.

The Skill references Vault policies instead of copying divergent lifecycle
rules. It supports both workspace-file access and the governed Obsidian MCP.

## Files

Repository:

```text
plugins/obsidian-knowledge-tool/
  skills/conversation-knowledge-triage/SKILL.md
  .claude-plugin/plugin.json
  README.md
```

Vault:

```text
00_System/Policies/Conversation-Knowledge-Triage.md
00_System/Templates/Conversation-Knowledge-Candidate.md
00_System/Integrations/AI-Client-Contract.md
AGENTS.md
Home.md
```

Changing plugin contents requires increasing
`plugins/obsidian-knowledge-tool/.claude-plugin/plugin.json` from `0.1.0` to
`0.2.0`. The plugin remains unpublished and is not added to
`.claude-plugin/marketplace.json`.

## Verification

Test the rule against at least these scenarios:

1. Pure small talk: no draft.
2. Confirmed durable decision: one decision draft.
3. Mixed conversation: only qualifying atomic candidates are saved.
4. Repeated conclusion: no duplicate draft.
5. Existing note plus new evidence: update-review draft linking the existing
   note.
6. Conflicting conclusion: conflict-review draft.
7. Credential in conversation: credential is excluded.
8. Unavailable Vault: no false success claim.
9. Multiple qualifying items: independent drafts with complete Properties.
10. Vault validation: all links, JSON, required directories, and lifecycle
    rules continue to pass.

## Future Extensions

- Client-specific hooks for more reliable session-end triggers.
- A governed MCP helper that validates conversation-candidate metadata.
- Periodic review dashboards for unreviewed conversation candidates.
- User-tuned thresholds or per-candidate-type policies.
- Local transcript importers for clients that provide stable, documented APIs.

