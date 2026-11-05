import type { FormatDefinition } from "../types";
import { indentSpacesSetting } from "./indent";

export const yaml = {
  id: "yaml",
  label: "YAML",
  glyph: "---",
  extension: "yaml",
  mime: "application/yaml",
  output: "text",
  runsOn: "worker",
  settings: [indentSpacesSetting],
  examples: {
    valid: "server:\n    port: 8080\n    tags: ['a', \"b\"]  # note\n",
    invalid: "a: 1\nc: [1, 2\n",
  },
  load: () => import("../formatters/yaml").then((m) => m.formatYaml),
} as const satisfies FormatDefinition;
