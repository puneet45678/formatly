import type { FormatDefinition } from "../types";

export const xml = {
  id: "xml",
  label: "XML",
  glyph: "</>",
  extension: "xml",
  mime: "application/xml",
  output: "text",
  runsOn: "worker",
  settings: [],
  examples: {
    valid: '<a><b x="1">t</b><c/></a>',
    invalid: "<a>\n  <b></a>",
  },
  load: () => import("../formatters/echo").then((m) => m.echo),
} as const satisfies FormatDefinition;
