import type { FormatDefinition } from "../types";

const SQL_START =
  /^(?:insert\s+into|delete\s+from|create\s+(?:or\s+replace\s+)?(?:temp(?:orary)?\s+)?(?:table|view|index|unique\s+index|function|procedure|database|schema)|alter\s+table|drop\s+(?:table|view|index|database|schema)|merge\s+into|truncate\s+table|with\s+\w+\s+as\s*\()\b/i;
const SQL_CLAUSE = /\b(?:from|into|where|join|union|group\s+by|order\s+by|limit|values|set)\b/i;
const SQL_PUNCTUATION = /[*,()=;]/;

/** A statement that starts like SQL and reads like it (so "Select the option you want" is not SQL). */
function detectSql(input: string): number {
  // Skip leading comments.
  const text = input.replace(/^(?:\s+|--[^\n]*\n?|\/\*[\s\S]*?\*\/)+/, "");
  const head = text.slice(0, 2000);
  if (SQL_START.test(head)) return 0.9;
  if (/^(?:select|update)\b/i.test(head)) return SQL_CLAUSE.test(head) && SQL_PUNCTUATION.test(head) ? 0.9 : 0.5;
  return 0;
}

export const sql = {
  id: "sql",
  label: "SQL",
  glyph: "SQL",
  extension: "sql",
  mime: "application/sql",
  output: "text",
  runsOn: "worker",
  settings: [
    {
      key: "dialect",
      label: "SQL dialect",
      default: "sql",
      // Values are sql-formatter language ids, so they pass straight through.
      options: [
        { value: "sql", label: "Standard" },
        { value: "transactsql", label: "SQL Server" },
        { value: "postgresql", label: "PostgreSQL" },
        { value: "mysql", label: "MySQL" },
      ],
    },
  ],
  examples: {
    valid: "select id, name from users where active = 1 order by name",
    invalid: "select *\nfrom t where (",
  },
  detect: detectSql,
  load: () => import("../formatters/sql").then((m) => m.formatSql),
} as const satisfies FormatDefinition;
