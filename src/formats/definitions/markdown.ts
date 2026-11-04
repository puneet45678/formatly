import type { FormatDefinition } from "../types";

export const markdown = {
  id: "markdown",
  label: "Markdown",
  glyph: "#",
  extension: "md",
  mime: "text/markdown",
  output: "text",
  runsOn: "worker",
  settings: [],
  examples: {
    valid: "# Notes\n* one\n* two\n\n__bold__ text",
    // Any text is valid Markdown, so there is no invalid example.
    invalid: "",
  },
  load: () => import("../formatters/echo").then((m) => m.echo),
} as const satisfies FormatDefinition;
