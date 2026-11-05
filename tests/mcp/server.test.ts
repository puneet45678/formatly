// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer, MAX_INPUT_CHARS, TOOL_FORMATS } from "../../mcp/server";
import { FORMATS } from "@/formats/registry";

// A real MCP client talking to the server over an in-memory transport, so the
// protocol, the schemas and the results are what an assistant would see.
let client: Client;

beforeEach(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverSide);
  client = new Client({ name: "test", version: "0" });
  await client.connect(clientSide);
});

afterEach(async () => {
  await client.close();
});

const text = (result: Awaited<ReturnType<Client["callTool"]>>) =>
  (result.content as { type: string; text: string }[]).map((c) => c.text).join("");

describe("formatly MCP server", () => {
  it("offers the format and list_formats tools, marked read-only", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["format", "list_formats"]);
    for (const tool of tools) expect(tool.annotations?.readOnlyHint).toBe(true);
  });

  it("offers every text format that runs without a browser, and not Mermaid", async () => {
    expect(TOOL_FORMATS.map((f) => f.id)).toEqual(FORMATS.filter((f) => f.id !== "mermaid").map((f) => f.id));
    const { tools } = await client.listTools();
    const format = tools.find((t) => t.name === "format")!;
    const formatEnum = (format.inputSchema.properties as Record<string, { enum?: string[] }>).format.enum;
    expect(formatEnum).toEqual(TOOL_FORMATS.map((f) => f.id));
    // Each format's settings are described, so an assistant knows what it can ask for.
    expect(format.description).toContain('"tab" (Tabs)');
    expect(format.description).toContain('"postgresql" (PostgreSQL)');
  });

  it("formats valid input", async () => {
    const result = await client.callTool({ name: "format", arguments: { format: "json", input: '{"a":[1,2]}' } });
    expect(result.isError).toBeFalsy();
    expect(text(result)).toBe('{\n  "a": [\n    1,\n    2\n  ]\n}');
    expect(result.structuredContent).toEqual({ status: "ok", output: '{\n  "a": [\n    1,\n    2\n  ]\n}', settings: { indent: "2" } });
  });

  it("applies settings, and reports the ones it used", async () => {
    const result = await client.callTool({
      name: "format",
      arguments: { format: "sql", input: "select a from t", settings: { indent: "4", dialect: "postgresql", bogus: "x" } },
    });
    expect(text(result)).toBe("SELECT\n    a\nFROM\n    t");
    expect(result.structuredContent).toMatchObject({ settings: { dialect: "postgresql", indent: "4" } });
  });

  it("reports a syntax error with its line and column, as an error the assistant can act on", async () => {
    const result = await client.callTool({ name: "format", arguments: { format: "json", input: '{\n  "a": 1,\n}' } });
    expect(result.isError).toBe(true);
    expect(text(result)).toBe("Invalid JSON at line 3, column 1: Property names must be in double quotes");
    expect(result.structuredContent).toMatchObject({ status: "invalid", line: 3, column: 1 });
  });

  it("refuses an unknown format through the schema", async () => {
    const result = await client.callTool({ name: "format", arguments: { format: "mermaid", input: "graph TD; A-->B" } });
    expect(result.isError).toBe(true);
  });

  it("refuses input over the size limit", async () => {
    const result = await client.callTool({ name: "format", arguments: { format: "yaml", input: "a".repeat(MAX_INPUT_CHARS + 1) } });
    expect(result.isError).toBe(true);
  });

  it("lists formats with their settings", async () => {
    const result = await client.callTool({ name: "list_formats", arguments: {} });
    const { formats } = result.structuredContent as { formats: { id: string; settings: { key: string; options: string[] }[] }[] };
    expect(formats.map((f) => f.id)).toEqual(TOOL_FORMATS.map((f) => f.id));
    expect(formats.find((f) => f.id === "yaml")!.settings).toEqual([{ key: "indent", label: "Indent", default: "2", options: ["2", "4"] }]);
  });
});
