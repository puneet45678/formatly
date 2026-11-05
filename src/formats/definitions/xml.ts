import type { FormatDefinition } from "../types";
import { indentSetting } from "./indent";

export const xml = {
  id: "xml",
  label: "XML",
  glyph: "</>",
  extension: "xml",
  mime: "application/xml",
  output: "text",
  runsOn: "worker",
  settings: [indentSetting],
  examples: {
    valid: '<a><b x="1">t</b><c/></a>',
    invalid: "<a>\n  <b></a>",
  },
  load: () => import("../formatters/xml").then((m) => m.formatXml),
} as const satisfies FormatDefinition;
