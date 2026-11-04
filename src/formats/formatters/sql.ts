import { format } from "sql-formatter";
import { formatError } from "../errors";
import type { FormatResult, FormatSettings } from "../types";

// sql-formatter reports problems by throwing an Error. The message starts like
// `Parse error: Unexpected "[id] from " at line 1 column 8.` or
// `Parse error at token: ) at line 1 column 8`, followed by extra hint lines.
// The quoted token can itself span several lines, so we look for the position
// in the whole message instead of cutting at the first line break.
const POSITION = /at line (\d+) column (\d+)/;
const TOKEN_PREFIX = /^Parse error at token:\s*/;
const PARSE_PREFIX = /^Parse error:\s*/;

// Standard SQL is the strictest dialect, so most "unexpected" errors there
// are really "this is another dialect's syntax".
const DIALECT_HINT = " — if this is SQL Server, MySQL or PostgreSQL, pick it in the dialect menu";

export function formatSql(input: string, settings: FormatSettings): FormatResult {
  const dialect = settings.dialect ?? "sql";

  try {
    // The cast is needed because FormatSettings values are plain strings;
    // the definition only offers ids sql-formatter knows.
    return { ok: true, output: format(input, { language: dialect as "sql", keywordCase: "upper" }) };
  } catch (error) {
    const full = error instanceof Error ? error.message : String(error);
    const match = POSITION.exec(full);
    const line = match ? Number(match[1]) : 1;
    const column = match ? Number(match[2]) : undefined;
    // Keep only the text before the position; without a position, the first line.
    const head = match ? full.slice(0, match.index) : full.split("\n")[0];

    // "«EOF»" means the parser ran out of text while still expecting more.
    if (head.includes("«EOF»")) {
      return formatError("The query ends before it is complete", line, column);
    }

    // Collapse line breaks and runs of spaces so the message reads on one line.
    const text = head.replace(/\s+/g, " ").trim();
    const message = TOKEN_PREFIX.test(text)
      ? `Unexpected "${text.replace(TOKEN_PREFIX, "")}"`
      : text.replace(PARSE_PREFIX, "");
    return formatError(dialect === "sql" ? message + DIALECT_HINT : message, line, column);
  }
}
