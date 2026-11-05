// Starts the bundled MCP server the way an assistant does (a child process
// speaking MCP over stdio) and checks that it lists and runs its tools.
// Run after `npm run build:mcp`.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "smoke-test", version: "0" });
await client.connect(new StdioClientTransport({ command: process.execPath, args: ["mcp/dist/formatly-mcp.cjs"] }));

const fail = (message) => {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
};

const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort().join(",");
if (names !== "format,list_formats") fail(`tools are ${names}`);

const checks = [
  ["json", '{"a":[1,2]}', '{\n  "a": [\n    1,\n    2\n  ]\n}'],
  ["yaml", "a:   1\nb: [x,  y]\n", "a: 1\nb: [ x, y ]\n"],
  ["xml", "<a><b>t</b></a>", "<a>\n  <b>t</b>\n</a>"],
  ["sql", "select a from t", "SELECT\n  a\nFROM\n  t"],
  ["markdown", "* one\n* two", "- one\n- two\n"],
];
for (const [format, input, expected] of checks) {
  const result = await client.callTool({ name: "format", arguments: { format, input } });
  const text = result.content.map((c) => c.text).join("");
  if (result.isError || text !== expected) fail(`${format}: got ${JSON.stringify(text)}`);
  else console.log(`ok   ${format}`);
}

const invalid = await client.callTool({ name: "format", arguments: { format: "json", input: "{,}" } });
if (!invalid.isError || !invalid.structuredContent?.line) fail("invalid JSON should come back as an error with a line");
else console.log("ok   invalid input reports its position");

await client.close();
if (!process.exitCode) console.log("MCP server bundle works over stdio");
