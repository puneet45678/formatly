import { describe, expect, it } from "vitest";
import { formatSql } from "@/formats/formatters/sql";

describe("formatSql", () => {
  it("formats with uppercase keywords", () =>
    expect(formatSql("select id,name from users where active=1", { dialect: "sql" })).toEqual({
      ok: true,
      output: "SELECT\n  id,\n  name\nFROM\n  users\nWHERE\n  active = 1",
    }));

  it("falls back to the standard dialect when none is given", () =>
    expect(formatSql("select 1", {})).toEqual({ ok: true, output: "SELECT\n  1" }));

  it("uses the chosen dialect", () =>
    expect(formatSql("select top 5 [id] from dbo.users", { dialect: "transactsql" }).ok).toBe(true));

  it("suggests choosing a dialect when Standard fails", () =>
    expect(formatSql("select [id] from t", { dialect: "sql" })).toEqual({
      ok: false,
      error: {
        message: 'Unexpected "[id] from " — if this is SQL Server, MySQL or PostgreSQL, pick it in the dialect menu',
        line: 1,
        column: 8,
      },
    }));

  it("does not add the dialect hint for a specific dialect", () => {
    // Backticks are MySQL-only, so PostgreSQL rejects them.
    expect(formatSql("select `a` from t", { dialect: "postgresql" })).toEqual({
      ok: false,
      error: { message: 'Unexpected "`a` from t"', line: 1, column: 8 },
    });
  });

  it("keeps the position and full message when the quoted token spans lines", () =>
    expect(formatSql("select 1\nfrom t\nwhere [id]\n  from x", { dialect: "sql" })).toEqual({
      ok: false,
      error: {
        message: 'Unexpected "[id] fro" — if this is SQL Server, MySQL or PostgreSQL, pick it in the dialect menu',
        line: 3,
        column: 7,
      },
    }));

  it("words an unexpected-token error as Unexpected", () =>
    expect(formatSql("select ) from t", { dialect: "postgresql" })).toEqual({
      ok: false,
      error: { message: 'Unexpected ")"', line: 1, column: 8 },
    }));

  it("explains a query that stops too early, with its position", () =>
    expect(formatSql("select *\nfrom t where (", { dialect: "postgresql" })).toEqual({
      ok: false,
      error: { message: "The query ends before it is complete", line: 2, column: 15 },
    }));

  it("is stable when formatted twice", () => {
    const first = formatSql("select a,b from t where x in (1,2) order by a", { dialect: "mysql" });
    if (!first.ok) throw new Error("expected ok");
    expect(formatSql(first.output, { dialect: "mysql" })).toEqual(first);
  });

  it("indents with the chosen width or tabs", () => {
    const input = "select a from t";
    expect(formatSql(input, { dialect: "sql", indent: "4" })).toEqual({ ok: true, output: "SELECT\n    a\nFROM\n    t" });
    expect(formatSql(input, { dialect: "sql", indent: "tab" })).toEqual({ ok: true, output: "SELECT\n\ta\nFROM\n\tt" });
  });
});
