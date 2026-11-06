import type { FormatDefinition } from "../types";

/** One element wrapping everything, or an XML declaration. HTML pages are left alone. */
function detectXml(input: string): number {
  const text = input.trim();
  if (/^<\?xml\b/i.test(text)) return 1;
  if (/^<(?:!doctype\s+html|html[\s>])/i.test(text)) return 0;
  const root = /^<([A-Za-z_][\w:.-]*)(?:\s[^<>]*)?(\/)?>/.exec(text);
  if (!root) return 0;
  if (root[2]) return /^<[^<>]*\/>$/.test(text) ? 0.8 : 0; // a lone self-closing element
  return text.endsWith(`</${root[1]}>`) || new RegExp(`</${root[1].replace(/[.:-]/g, "\\$&")}\\s*>$`).test(text) ? 0.9 : 0;
}

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
  detect: detectXml,
  load: () => import("../formatters/xml").then((m) => m.formatXml),
} as const satisfies FormatDefinition;
