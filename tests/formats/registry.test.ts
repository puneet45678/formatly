import { describe, expect, it } from "vitest";
import {
  FORMATS,
  DEFAULT_FORMAT,
  defaultSettings,
  getFormat,
  isFormatId,
  sanitizeSettings,
} from "@/formats/registry";
import { FORMAT_UI } from "@/components/format-ui";

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
    expect(FORMATS.filter((f) => f.output === "diagram").map((f) => f.id)).toEqual(["mermaid"]);
  });

  it("isFormatId accepts known and rejects others", () => {
    expect(isFormatId("yaml")).toBe(true);
    for (const v of ["csv", "", null, undefined, 42, "JSON"]) expect(isFormatId(v)).toBe(false);
  });

  it("getFormat returns the matching definition", () => {
    expect(getFormat("sql").label).toBe("SQL");
  });

  it("defaults to json", () => {
    expect(DEFAULT_FORMAT).toBe("json");
  });

  it("lists SQL dialects in order as the SQL setting", () => {
    const [dialect] = getFormat("sql").settings;
    expect(dialect.key).toBe("dialect");
    expect(dialect.label).toBe("SQL dialect");
    expect(dialect.options.map((o) => o.label)).toEqual(["Standard", "SQL Server", "PostgreSQL", "MySQL"]);
    expect(dialect.options.map((o) => o.value)).toEqual(["sql", "transactsql", "postgresql", "mysql"]);
  });

  it("derives ids, labels and order from the definitions", () =>
    expect(FORMATS.map((f) => f.id)).toEqual(["json", "yaml", "mermaid", "xml", "sql", "markdown"]));

  it("has unique ids, glyphs and extensions", () => {
    for (const key of ["id", "glyph", "extension"] as const)
      expect(new Set(FORMATS.map((f) => f[key])).size).toBe(FORMATS.length);
  });

  it("only mermaid runs on the main thread", () =>
    expect(FORMATS.filter((f) => f.runsOn === "main").map((f) => f.id)).toEqual(["mermaid"]));

  it("gives every format a UI entry", () =>
    expect(Object.keys(FORMAT_UI).sort()).toEqual(FORMATS.map((f) => f.id).sort()));

  it("every setting default is one of its options", () => {
    for (const f of FORMATS) for (const s of f.settings) expect(s.options.map((o) => o.value)).toContain(s.default);
  });

  it("defaultSettings fills each setting", () => {
    expect(defaultSettings("sql")).toEqual({ dialect: "sql" });
    expect(defaultSettings("json")).toEqual({});
  });

  it("ignores unknown or corrupt stored settings", () => {
    expect(sanitizeSettings("sql", { dialect: "oracle", extra: "x" })).toEqual({ dialect: "sql" });
    expect(sanitizeSettings("sql", "not an object")).toEqual({ dialect: "sql" });
    expect(sanitizeSettings("sql", null)).toEqual({ dialect: "sql" });
    expect(sanitizeSettings("sql", ["mysql"])).toEqual({ dialect: "sql" });
    expect(sanitizeSettings("sql", { dialect: "mysql" })).toEqual({ dialect: "mysql" });
  });
});
