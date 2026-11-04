import type { FormatDefinition } from "../types";

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
  load: () => import("../formatters/echo").then((m) => m.echo),
} as const satisfies FormatDefinition;
