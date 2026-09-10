# Obsidian Knowledge MCP

Local stdio MCP server that exposes governed knowledge-management operations
over Obsidian Local REST API.

## Commands

```powershell
npm install
npm test
npm run build
```

The build bundles all runtime dependencies into `dist/index.js`.

## Environment

- `OBSIDIAN_API_URL`: Local REST API base URL.
- `OBSIDIAN_API_KEY`: Bearer token.
- `OBSIDIAN_ALLOW_INSECURE_TLS`: `true` only when accepting the plugin's
  self-signed local certificate. TLS verification is disabled only for this
  client's Undici agent.

## Tools

- `obsidian_health_check`
- `obsidian_search_notes`
- `obsidian_read_note`
- `obsidian_capture_inbox`
- `obsidian_save_ai_draft`
- `obsidian_validate_note`
- `obsidian_promote_note`
- `obsidian_archive_note`

The server writes diagnostics to stderr and reserves stdout for MCP messages.
