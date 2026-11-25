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
  it("includes the shipped formats", () => {
    expect(FORMATS.map((f) => f.id)).toEqual(
      expect.arrayContaining(["json", "yaml", "mermaid", "xml", "sql", "markdown"]),
    );
  });

  it("has unique labels, glyphs and extensions", () => {
    for (const key of ["label", "glyph", "extension"] as const)
      expect(new Set(FORMATS.map((f) => f[key])).size).toBe(FORMATS.length);
  });

  it("uses bare file extensions", () => {
    for (const f of FORMATS) expect(f.extension).toMatch(/^[a-z0-9]+$/);
  });

  it("gives diagrams an svg extension and text formats their own", () => {
    for (const f of FORMATS) if (f.output === "diagram") expect(f.extension).toBe("svg");
  });

  it("runs on the main thread only the formats that draw diagrams", () => {
    for (const f of FORMATS) if (f.runsOn === "main") expect(f.output).toBe("diagram");
  });

  it("keeps the shipped formats in rail order", () => {
    const shipped = ["json", "yaml", "mermaid", "xml", "sql", "markdown"];
    expect(FORMATS.map((f) => f.id).filter((id) => shipped.includes(id))).toEqual(shipped);
  });

  it("isFormatId accepts known and rejects others", () => {
    expect(isFormatId("yaml")).toBe(true);
    for (const v of ["not-a-format", "", null, undefined, 42, "JSON"]) expect(isFormatId(v)).toBe(false);
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

  it("has unique ids", () => expect(new Set(FORMATS.map((f) => f.id)).size).toBe(FORMATS.length));

  it("gives every format a UI entry", () =>
    expect(Object.keys(FORMAT_UI).sort()).toEqual(FORMATS.map((f) => f.id).sort()));

  it("every setting default is one of its options", () => {
    for (const f of FORMATS) for (const s of f.settings) expect(s.options.map((o) => o.value)).toContain(s.default);
  });

  it("defaultSettings fills each setting", () => {
    expect(defaultSettings("sql")).toEqual({ dialect: "sql", indent: "2" });
    expect(defaultSettings("json")).toEqual({ indent: "2" });
    expect(defaultSettings("markdown")).toEqual({});
  });

  it("ignores unknown or corrupt stored settings", () => {
    const sqlDefaults = { dialect: "sql", indent: "2" };
    expect(sanitizeSettings("sql", { dialect: "oracle", extra: "x" })).toEqual(sqlDefaults);
    expect(sanitizeSettings("sql", "not an object")).toEqual(sqlDefaults);
    expect(sanitizeSettings("sql", null)).toEqual(sqlDefaults);
    expect(sanitizeSettings("sql", ["mysql"])).toEqual(sqlDefaults);
    expect(sanitizeSettings("sql", { dialect: "mysql" })).toEqual({ dialect: "mysql", indent: "2" });
    // Settings stored before indent existed still load, with the default indent.
    expect(sanitizeSettings("json", {})).toEqual({ indent: "2" });
  });

  it("offers tabs everywhere indent is offered except YAML, which forbids them", () => {
    const indentOptions = Object.fromEntries(
      FORMATS.flatMap((f) => f.settings.filter((s) => s.key === "indent").map((s) => [f.id, s.options.map((o) => o.value)])),
    );
    expect(indentOptions).toEqual({
      json: ["2", "4", "tab"],
      yaml: ["2", "4"],
      xml: ["2", "4", "tab"],
      sql: ["2", "4", "tab"],
    });
    expect(sanitizeSettings("yaml", { indent: "tab" })).toEqual({ indent: "2" });
  });
});
