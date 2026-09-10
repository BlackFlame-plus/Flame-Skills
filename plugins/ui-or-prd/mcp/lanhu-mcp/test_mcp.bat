@echo off
set MCP_TRANSPORT=stdio
echo Testing MCP server...
echo {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05"}} | python "D:\jcCode\AI_project\front-skills\plugins\ui-or-prd-tool\mcp\lanhu-mcp\lanhu_mcp_server.py"
