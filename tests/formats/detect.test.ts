import { describe, expect, it } from "vitest";
import { detectFormat } from "@/formats/detect";
import { FORMATS } from "@/formats/registry";
import type { FormatDefinition, FormatId } from "@/formats/types";

// What a person would paste, from another format's page. `from` is the page they are on.
const SAMPLES: { name: string; text: string; is: FormatId }[] = [
  { name: "a JSON object", text: '{"name":"Asha","tags":["a","b"],"n":1.5}', is: "json" },
  { name: "a JSON array", text: '[{"id":1},{"id":2}]', is: "json" },
  { name: "pretty JSON", text: '{\n  "a": 1,\n  "b": {\n    "c": true\n  }\n}\n', is: "json" },
  { name: "YAML with nesting", text: "server:\n  port: 8080\n  hosts:\n    - a\n    - b\nname: demo\n", is: "yaml" },
  { name: "YAML with a document marker", text: "---\nkey: value\nother: 2\n", is: "yaml" },
  { name: "YAML with comments", text: "# settings\nname: demo # the name\nport: 80\n", is: "yaml" },
  { name: "a Mermaid flowchart", text: "flowchart TD\n  A[Start] --> B{Ok?}\n  B -->|yes| C[Done]", is: "mermaid" },
  { name: "a one-line Mermaid graph", text: "graph TD; A-->B", is: "mermaid" },
  { name: "a Mermaid sequence diagram", text: "sequenceDiagram\n  Alice->>Bob: Hi", is: "mermaid" },
  { name: "Mermaid with frontmatter and comments", text: "---\ntitle: T\n---\n%% note\ngraph LR\n  A-->B", is: "mermaid" },
  { name: "XML with a declaration", text: '<?xml version="1.0"?>\n<a><b/></a>', is: "xml" },
  { name: "an XML document", text: '<root id="1">\n  <item>one</item>\n  <item>two</item>\n</root>', is: "xml" },
  { name: "a SQL query", text: "SELECT id, name FROM users WHERE active = 1 ORDER BY name;", is: "sql" },
  { name: "SQL after a comment", text: "-- all users\nselect * from users", is: "sql" },
  { name: "SQL that creates a table", text: "CREATE TABLE t (id int primary key, name text);", is: "sql" },
  { name: "a Markdown document", text: "# Release notes\n\n- Faster **builds**\n- Fixed [a bug](https://example.com)\n", is: "markdown" },
  { name: "Markdown with a code fence", text: "## Install\n\n```bash\nnpm install\n```\n", is: "markdown" },
];

const otherPage = (is: FormatId): FormatId => FORMATS.find((f) => f.id !== is)!.id;

describe("detectFormat", () => {
  it.each(SAMPLES)("recognises $name from any other page", ({ text, is }) => {
    for (const { id } of FORMATS) {
      if (id === is) continue;
      expect(detectFormat(text, id)).toBe(is);
    }
  });

  it.each(SAMPLES)("stays quiet when $name is pasted on its own page", ({ text, is }) => {
    expect(detectFormat(text, is)).toBeNull();
  });

  it.each([
    ["plain words", "hello there, this is just some text"],
    ["a single word", "hello"],
    ["a number", "12345"],
    ["a lone Markdown heading", "# Title"],
    ["an English sentence starting with select", "Select the option you want, then continue."],
    ["a YAML-looking sentence", "Note: this is only a sentence"],
    ["an HTML page", "<!DOCTYPE html><html><body>hi</body></html>"],
    ["empty text", ""],
    ["only spaces", "   \n  "],
  ])("makes no suggestion for %s", (_name, text) => {
    for (const { id } of FORMATS) expect(detectFormat(text, id)).toBeNull();
  });

  it("does not take broken JSON for another format", () => {
    // A trailing comma is still JSON, so the JSON page keeps it and other pages are offered JSON.
    expect(detectFormat('{"a": 1,}', "json")).toBeNull();
    expect(detectFormat('{"a": 1,}', otherPage("json"))).toBe("json");
  });

  it("does not offer Markdown for YAML that has comment lines", () => {
    expect(detectFormat("# one\na: 1\n# two\nb: 2\n", "yaml")).toBeNull();
  });

  it("copes with a very large paste quickly", () => {
    const big = JSON.stringify(Array.from({ length: 150_000 }, (_, i) => ({ id: i, name: `n${i}` })));
    const start = performance.now();
    expect(detectFormat(big, otherPage("json"))).toBe("json");
    expect(performance.now() - start).toBeLessThan(1000);
  });

  // Patterns that backtrack can take minutes on one long line; every one of these must stay quick.
  it.each([
    ["open brackets", "[".repeat(200_000)],
    ["a long YAML-like line", "a: ".repeat(100_000)],
    ["unclosed tags", "<a ".repeat(100_000)],
    ["a long tag name", `<${"a".repeat(200_000)}`],
    ["repeated selects", "select ".repeat(100_000)],
    ["link-like text", "[x](".repeat(100_000)],
    ["emphasis marks", "**a ".repeat(100_000)],
    ["a long comment", `-- ${"x".repeat(500_000)}`],
    ["many blank lines", "\n".repeat(500_000)],
    ["many short lines", "a: 1\n".repeat(200_000)],
    ["quotes", '"'.repeat(200_000)],
  ])("stays quick on %s", (_name, text) => {
    const start = performance.now();
    for (const { id } of FORMATS) expect(() => detectFormat(text, id)).not.toThrow();
    expect(performance.now() - start).toBeLessThan(2000);
  });
});

describe("every format's own valid example", () => {
  it.each(FORMATS.map((f) => [f.id, f.examples.valid] as const))("%s is never mistaken for a different format", (id, example) => {
    for (const { id: page } of FORMATS) {
      const found = detectFormat(example, page);
      if (page === id) expect(found).toBeNull();
      else expect(found === id || found === null).toBe(true);
    }
  });

  it("is recognised as itself from another page (a format that cannot be detected has no detector)", () => {
    for (const f of FORMATS) {
      if (!("detect" in f)) continue;
      const page = otherPage(f.id);
      expect(detectFormat(f.examples.valid, page)).toBe(f.id);
    }
  });
});

describe("formats without a detector", () => {
  // A new format does not have to say how to recognise itself; it is just never suggested.
  const plain = (id: string): FormatDefinition => ({
    id, label: id, glyph: id, extension: id, mime: "text/plain", output: "text", runsOn: "worker",
    settings: [], examples: { valid: "", invalid: "" }, load: async () => () => ({ ok: true, output: "" }),
  });

  it("are skipped, and never break detection of the others", () => {
    const formats = [plain("csv"), ...FORMATS];
    expect(detectFormat("name: demo\nport: 80\n", "json", formats)).toBe("yaml");
    expect(detectFormat("a,b\n1,2", "json", formats)).toBeNull();
  });

  it("can be the page you are on", () => {
    expect(detectFormat('{"a":1}', "csv" as FormatId, [plain("csv"), ...FORMATS])).toBe("json");
  });
});
