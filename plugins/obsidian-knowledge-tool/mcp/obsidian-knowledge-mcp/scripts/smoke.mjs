import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["dist/index.js"],
  env: {
    ...process.env,
    OBSIDIAN_API_URL: "https://127.0.0.1:27124",
    OBSIDIAN_API_KEY: ""
  }
});
const client = new Client({ name: "obsidian-knowledge-smoke", version: "0.1.0" });

try {
  await client.connect(transport);
  const listed = await client.listTools();
  const names = listed.tools.map((tool) => tool.name);
  if (names.length !== 8 || !names.includes("obsidian_health_check")) {
    throw new Error(`Unexpected MCP tools: ${names.join(", ")}`);
  }

  const health = await client.callTool({
    name: "obsidian_health_check",
    arguments: {}
  });
  if (!health.isError) {
    throw new Error("Health check should report missing local credentials.");
  }
  console.log(`MCP smoke passed: ${names.length} tools; configuration error handled.`);
} finally {
  await client.close();
}
