import { XMLValidator } from "fast-xml-parser";
import xmlFormatter from "xml-formatter";
import { formatError } from "../errors";
import type { FormatResult, FormatSettings } from "../types";

// xml-formatter does not reject broken XML (it happily formats "<a><b></a>"),
// so fast-xml-parser checks the text first and gives us the error position.
export function formatXml(input: string, settings: FormatSettings = {}): FormatResult {
  const check = XMLValidator.validate(input);
  if (check !== true) {
    const { msg, line, col } = check.err;
    return formatError(msg, line, col);
  }

  try {
    // collapseContent keeps text-only elements on one line, so mixed content
    // such as "<p>Hello <b>world</b></p>" is not changed.
    const indentation = settings.indent === "tab" ? "\t" : " ".repeat(Number(settings.indent ?? 2));
    return { ok: true, output: xmlFormatter(input, { indentation, collapseContent: true, lineSeparator: "\n" }) };
  } catch (e) {
    // Validation passed, so this should not happen; report on line 1 just in case.
    return formatError(e instanceof Error ? e.message : String(e), 1);
  }
}
