import type { FormatDefinition } from "../types";
import { indentSetting } from "./indent";

export const json = {
  id: "json",
  label: "JSON",
  glyph: "{ }",
  extension: "json",
  mime: "application/json",
  output: "text",
  runsOn: "worker",
  settings: [indentSetting],
  examples: {
    valid: '{"name":"Asha","roles":["admin","dev"],"active":true}',
    invalid: '{"a": 1,}',
  },
  load: () => import("../formatters/json").then((m) => m.formatJson),
} as const satisfies FormatDefinition;
