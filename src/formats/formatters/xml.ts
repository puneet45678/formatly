import { XMLValidator } from "fast-xml-parser";
import xmlFormatter from "xml-formatter";
import { formatError } from "../errors";
import type { FormatResult } from "../types";

// xml-formatter trims the text inside an element, so "<delim>\t</delim>" would lose its tab.
// Text-only elements whose text starts or ends with whitespace are swapped for a
// placeholder before formatting and put back afterwards, so their whitespace survives.
const PLACEHOLDER_OPEN = "\uE000";
const PLACEHOLDER_CLOSE = "\uE001";
// An opening tag (not self-closing), its text with no child tags, then the closing tag.
const TEXT_ONLY_ELEMENT = /(<[A-Za-z_][^<>]*(?<!\/)>)([^<]*)(?=<\/)/g;

function protectWhitespace(input: string): { text: string; saved: string[] } {
  const saved: string[] = [];
  if (input.includes(PLACEHOLDER_OPEN) || input.includes(PLACEHOLDER_CLOSE)) return { text: input, saved };
  const text = input.replace(TEXT_ONLY_ELEMENT, (whole, open: string, content: string) => {
    if (!/^\s|\s$/.test(content)) return whole;
    saved.push(content);
    return `${open}${PLACEHOLDER_OPEN}${saved.length - 1}${PLACEHOLDER_CLOSE}`;
  });
  return { text, saved };
}

function restoreWhitespace(output: string, saved: string[]): string {
  if (saved.length === 0) return output;
  return output.replace(new RegExp(`${PLACEHOLDER_OPEN}(\\d+)${PLACEHOLDER_CLOSE}`, "g"), (_, i) => saved[Number(i)]);
}

// xml-formatter does not reject broken XML (it happily formats "<a><b></a>"),
// so fast-xml-parser checks the text first and gives us the error position.
// The settings argument is ignored, so this fits the Formatter type with one parameter.
export function formatXml(input: string): FormatResult {
  const check = XMLValidator.validate(input);
  if (check !== true) {
    const { msg, line, col } = check.err;
    return formatError(msg, line, col);
  }

  try {
    // collapseContent keeps text-only elements on one line, so mixed content
    // such as "<p>Hello <b>world</b></p>" is not changed.
    const { text, saved } = protectWhitespace(input);
    const formatted = xmlFormatter(text, { indentation: "  ", collapseContent: true, lineSeparator: "\n" });
    return { ok: true, output: restoreWhitespace(formatted, saved) };
  } catch (e) {
    // Validation passed, so this should not happen; report on line 1 just in case.
    return formatError(e instanceof Error ? e.message : String(e), 1);
  }
}
