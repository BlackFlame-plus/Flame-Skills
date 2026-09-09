# Obsidian Knowledge Tool V1 Design

## Goal

Create an unpublished local plugin prototype that lets MCP clients manage the
`Local-AI-Brain` Obsidian Vault through a governed set of knowledge-management
tools.

The prototype lives under `plugins/obsidian-knowledge-tool/`. It must not be
added to `.claude-plugin/marketplace.json` and must not be pushed to the remote
marketplace during this task.

## Architecture

```text
Cursor or another MCP client
  -> obsidian-knowledge-tool MCP server (stdio)
  -> governance validation
  -> Obsidian Local REST API
  -> D:/Obsidian/Local-AI-Brain
```

The MCP server calls the Local REST API directly. It does not expose the Local
REST API's unrestricted write or delete operations, because doing so would
allow clients to bypass governance.

## Plugin Contents

```text
plugins/obsidian-knowledge-tool/
  .claude-plugin/plugin.json
  .mcp.json
  skills/obsidian-knowledge-governance/SKILL.md
  mcp/obsidian-knowledge-mcp/
    package.json
    tsconfig.json
    esbuild.mjs
    src/
    tests/
    README.md
```

The MCP server uses TypeScript, the official MCP TypeScript SDK, Zod schemas,
and stdio transport. Its release build is bundled into a single JavaScript
entry so plugin users do not need to install runtime dependencies.

## V1 Tools

- `obsidian_health_check`: verify Obsidian and authentication.
- `obsidian_search_notes`: search notes and return focused matches.
- `obsidian_read_note`: read an allowed Markdown note.
- `obsidian_capture_inbox`: create a new note under `01_Inbox`.
- `obsidian_save_ai_draft`: create a draft under `40_Output/AI-Drafts`.
- `obsidian_promote_note`: move an Inbox or AI draft note into an allowed
  Projects, Areas, Knowledge, or Output destination after validation.
- `obsidian_archive_note`: move an eligible note into `50_Archive`.
- `obsidian_validate_note`: validate path, frontmatter, and lifecycle rules
  without modifying the note.

No generic write, overwrite, delete, command-execution, or attachment-upload
tool is exposed in V1.

## Governance

- New captures may only be created in `01_Inbox`.
- AI-generated content may only be created in `40_Output/AI-Drafts`.
- Promotion targets are limited to `10_Projects`, `20_Areas`, `30_Knowledge`,
  and non-draft `40_Output` paths.
- Archive destinations are limited to `50_Archive`.
- All paths are normalized and checked against traversal.
- Markdown filenames are generated or validated by the server.
- Required frontmatter, including `reviewed`, is generated for captures and
  validated before moves.
- Promotion requires complete destination Markdown with `reviewed: true`;
  Knowledge and Output destinations enforce their matching `type`.
- Archive moves update the note to `status: archived`.
- Existing destinations are never overwritten.
- Move operations require the caller to provide the source content hash,
  preventing accidental overwrites after concurrent edits.
- A move is implemented as read, destination-conflict check, write, content
  verification, then source-to-trash. If the final step fails, the safe failure
  mode is a duplicate rather than data loss.
- Secrets are read from environment variables and never stored in the plugin.

## Configuration

The plugin's `.mcp.json` starts the bundled server via
`${CLAUDE_PLUGIN_ROOT}`. The plugin manifest declares enable-time `userConfig`
fields and maps them into the server environment:

- `OBSIDIAN_API_URL`
- `OBSIDIAN_API_KEY`
- optional `OBSIDIAN_ALLOW_INSECURE_TLS` for the Local REST API's self-signed
  certificate

The API key field is marked sensitive so Claude Code stores it as a credential
instead of plain plugin settings.

## Error Handling

Errors distinguish unavailable Obsidian, authentication failure, missing note,
invalid path, invalid metadata, stale content hash, and destination conflict.
Messages include a safe corrective action.

## Verification

- Unit tests cover paths, frontmatter, lifecycle transitions, and overwrite
  prevention.
- HTTP tests use a mock Local REST API.
- The TypeScript build must pass.
- MCP Inspector or an SDK client must list and invoke the tools.
- Repository verification must confirm that `marketplace.json` is unchanged
  and no secret is tracked.

## Deferred

- Binary attachment upload.
- Deletion and unrestricted overwrite.
- Semantic-vector search beyond Obsidian's available search endpoint.
- Claude Desktop `.mcpb` packaging.
- Publication in the plugin marketplace.
