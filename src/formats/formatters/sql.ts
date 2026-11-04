import { format } from "sql-formatter";
import { formatError } from "../errors";
import type { FormatResult, FormatSettings } from "../types";

// sql-formatter reports problems by throwing an Error. The first line of its
// message ends with the position, e.g. `Parse error: Unexpected "[id] from " at line 1 column 8.`
// Later lines are extra hints we do not need.
const POSITION = /at line (\d+) column (\d+)/;
const LEADING_PREFIX = /^Parse error( at token:)?:?\s*/;
const POSITION_SUFFIX = /\s*at line \d+ column \d+\.?$/;

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
    const firstLine = (error instanceof Error ? error.message : String(error)).split("\n")[0];
    const match = POSITION.exec(firstLine);
    const line = match ? Number(match[1]) : 1;
    const column = match ? Number(match[2]) : undefined;

    // "«EOF»" means the parser ran out of text while still expecting more.
    if (firstLine.includes("«EOF»")) {
      return formatError("The query ends before it is complete", line, column);
    }

    const message = firstLine.replace(LEADING_PREFIX, "").replace(POSITION_SUFFIX, "");
    return formatError(dialect === "sql" ? message + DIALECT_HINT : message, line, column);
  }
}
