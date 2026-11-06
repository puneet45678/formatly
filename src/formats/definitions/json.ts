import type { FormatDefinition } from "../types";

/** Objects and arrays only: a bare number or word is not worth a suggestion. */
function detectJson(input: string): number {
  const text = input.trim();
  if (!/^[{[]/.test(text)) return 0;
  if (text.length > 1_000_000) return 0.8; // too big to parse just to guess
  try {
    JSON.parse(text);
    return 1;
  } catch {
    // Broken, but if it looks like JSON (quoted keys, or an array) it is JSON with a mistake in it.
    return /^(\{\s*["}]|\[)/.test(text) ? 0.75 : 0.5;
  }
}

export const json = {
  id: "json",
  label: "JSON",
  glyph: "{ }",
  extension: "json",
  mime: "application/json",
  output: "text",
  runsOn: "worker",
  settings: [],
  examples: {
    valid: '{"name":"Asha","roles":["admin","dev"],"active":true}',
    invalid: '{"a": 1,}',
  },
  detect: detectJson,
  load: () => import("../formatters/json").then((m) => m.formatJson),
} as const satisfies FormatDefinition;
