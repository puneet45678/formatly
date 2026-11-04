import type { FormatDefinition } from "../types";

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
  load: () => import("../formatters/sql").then((m) => m.formatSql),
} as const satisfies FormatDefinition;
