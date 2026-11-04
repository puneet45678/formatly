import { describe, expect, it } from "vitest";
import { FORMATS, SQL_DIALECTS, DEFAULT_FORMAT, getFormat, isFormatId } from "@/formats/registry";

describe("format registry", () => {
  it("lists formats in rail order", () => {
    expect(FORMATS.map((f) => f.id)).toEqual(["json", "yaml", "mermaid", "xml", "sql", "markdown"]);
  });

  it("has the spec labels", () => {
    expect(FORMATS.map((f) => f.label)).toEqual(["JSON", "YAML", "Mermaid", "XML", "SQL", "Markdown"]);
  });

  it("has the spec glyphs", () => {
    expect(FORMATS.map((f) => f.glyph)).toEqual(["{ }", "---", "->", "</>", "SQL", "#"]);
  });

  it("uses spec extensions", () => {
    expect(Object.fromEntries(FORMATS.map((f) => [f.id, f.extension]))).toEqual({
      json: "json",
      yaml: "yaml",
      mermaid: "svg",
      xml: "xml",
      sql: "sql",
      markdown: "md",
    });
  });

  it("marks only mermaid as diagram", () => {
    expect(FORMATS.filter((f) => f.outputKind === "diagram").map((f) => f.id)).toEqual(["mermaid"]);
  });

  it("isFormatId accepts known and rejects others", () => {
    expect(isFormatId("yaml")).toBe(true);
    for (const v of ["csv", "", null, undefined, 42, "JSON"]) expect(isFormatId(v)).toBe(false);
  });

  it("getFormat returns the matching meta", () => {
    expect(getFormat("sql").label).toBe("SQL");
  });

  it("defaults to json", () => {
    expect(DEFAULT_FORMAT).toBe("json");
  });

  it("lists SQL dialects in order", () => {
    expect(SQL_DIALECTS.map((d) => d.label)).toEqual(["Standard", "SQL Server", "PostgreSQL", "MySQL"]);
    expect(SQL_DIALECTS.map((d) => d.id)).toEqual(["sql", "transactsql", "postgresql", "mysql"]);
  });
});
