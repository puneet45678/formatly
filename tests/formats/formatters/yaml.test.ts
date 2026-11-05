import { describe, expect, it } from "vitest";
import { parseAllDocuments } from "yaml";
import { formatYaml } from "@/formats/formatters/yaml";

describe("formatYaml", () => {
  it("re-indents to 2 spaces", () =>
    expect(formatYaml("list:\n    - a\n    - b\n")).toEqual({ ok: true, output: "list:\n  - a\n  - b\n" }));

  it("keeps quotes and comments", () =>
    expect(formatYaml("name:   'single'   # comment\nb: \"dq\"\n")).toEqual({
      ok: true,
      output: "name: 'single' # comment\nb: \"dq\"\n",
    }));

  it("keeps long lines unwrapped", () => {
    const input = `text: ${Array.from({ length: 30 }, (_, i) => `word${i}`).join(" ")}\n`;
    expect(formatYaml(input)).toEqual({ ok: true, output: input });
  });

  it("keeps multiple documents", () =>
    expect(formatYaml("a: 1\n---\nb: 2\n")).toEqual({ ok: true, output: "a: 1\n---\nb: 2\n" }));

  it("keeps meaning", () => {
    const input = "server:\n    port: 8080\n    tags: ['a', \"b\"]  # note\nlist:\n        - x: 1\n          y: [1, 2]\n";
    const out = (formatYaml(input) as { output: string }).output;
    const values = (text: string) => parseAllDocuments(text).map((d) => d.toJS());
    expect(values(out)).toEqual(values(input));
  });

  it("reports the first error with its position", () =>
    expect(formatYaml("a: 1\nc: [1, 2\n")).toMatchObject({ ok: false, error: { line: 3, column: 1 } }));

  it('drops the " at line…" suffix from messages', () => {
    const result = formatYaml("a: 1\nc: [1, 2\n");
    if (result.ok) throw new Error("expected an error");
    expect(result.error.message).not.toMatch(/ at line \d+/);
    expect(result.error.message).not.toBe("");
  });

  it("reports duplicate keys", () =>
    expect(formatYaml("a: 1\na: 2\n")).toMatchObject({
      ok: false,
      error: { message: "Map keys must be unique", line: 2 },
    }));

  it("indents with the chosen width", () =>
    expect(formatYaml("a:\n  b:\n    c: 1\n", { indent: "4" })).toEqual({ ok: true, output: "a:\n    b:\n        c: 1\n" }));
});
