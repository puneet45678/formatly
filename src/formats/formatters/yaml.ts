import { parseAllDocuments } from "yaml";
import { formatError } from "../errors";
import type { FormatResult, FormatSettings } from "../types";

// The yaml library keeps quote styles, comments and "---" markers when it
// writes a document back out, so formatting is just parse + print.

// The library puts "at line 3, column 1:" at the end of the first line of its
// messages. We report the position separately, so drop it from the text.
const POSITION_SUFFIX = / at line \d+, column \d+:?$/;

export function formatYaml(input: string, settings: FormatSettings = {}): FormatResult {
  // A file can hold several documents separated by "---"; each is parsed on its own.
  const docs = parseAllDocuments(input);

  for (const doc of docs) {
    const error = doc.errors[0];
    if (!error) continue;
    const message = error.message.split("\n")[0].replace(POSITION_SUFFIX, "");
    const [pos] = error.linePos ?? [];
    return pos ? formatError(message, pos.line, pos.col) : formatError(message, 1);
  }

  // lineWidth: 0 turns off line wrapping, which would otherwise re-flow long lines.
  const indent = Number(settings.indent ?? 2);
  return { ok: true, output: docs.map((doc) => doc.toString({ indent, lineWidth: 0 })).join("") };
}
