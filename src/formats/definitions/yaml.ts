import type { FormatDefinition } from "../types";

const KEY_LINE = /^\s*(?:-\s+)?(?:"[^"]*"|'[^']*'|[\w.\-/]+)\s*:(?:\s|$)/;
const OTHER_YAML_LINE = /^(?:\s*(?:-(?:\s|$)|#)|---|\.\.\.|\s+\S)/; // list item, comment, marker, or indented continuation

/** Mostly "key: value" lines (at least two), nothing that reads like prose. */
function detectYaml(input: string): number {
  const text = input.trim();
  if (/^[{[<]/.test(text)) return 0; // JSON-style brackets or XML
  const lines = text.split(/\r?\n/, 5000).filter((line) => line.trim() !== "");
  let keys = 0;
  let structural = 0;
  for (const line of lines) {
    if (KEY_LINE.test(line)) {
      keys++;
      structural++;
    } else if (OTHER_YAML_LINE.test(line)) {
      structural++;
    }
  }
  if (keys < 2 || structural / lines.length < 0.7) return 0;
  return lines[0].trim() === "---" ? 0.9 : 0.8;
}

export const yaml = {
  id: "yaml",
  label: "YAML",
  glyph: "---",
  extension: "yaml",
  mime: "application/yaml",
  output: "text",
  runsOn: "worker",
  settings: [],
  examples: {
    valid: "server:\n    port: 8080\n    tags: ['a', \"b\"]  # note\n",
    invalid: "a: 1\nc: [1, 2\n",
  },
  detect: detectYaml,
  load: () => import("../formatters/yaml").then((m) => m.formatYaml),
} as const satisfies FormatDefinition;
