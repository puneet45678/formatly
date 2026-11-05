import { describe, expect, it } from "vitest";
import { XMLParser } from "fast-xml-parser";
import { formatXml } from "@/formats/formatters/xml";

describe("formatXml", () => {
  it("indents with 2 spaces", () =>
    expect(formatXml('<a><b x="1">t</b><c/></a>')).toEqual({
      ok: true,
      output: '<a>\n  <b x="1">t</b>\n  <c/>\n</a>',
    }));

  it("leaves mixed content alone", () =>
    expect(formatXml("<p>Hello <b>world</b>, again</p>")).toEqual({
      ok: true,
      output: "<p>Hello <b>world</b>, again</p>",
    }));

  it("keeps meaning", () => {
    const input = '<root id="7">\n<item a="1">one</item><item a="2">two</item><empty/>\n</root>';
    const out = (formatXml(input) as { output: string }).output;
    const parse = (text: string) => new XMLParser({ ignoreAttributes: false, trimValues: true }).parse(text);
    expect(parse(out)).toEqual(parse(input));
  });

  it("keeps the declaration and comments", () => {
    const out = (formatXml('<?xml version="1.0" encoding="UTF-8"?><!-- note --><a><b/></a>') as { output: string })
      .output;
    expect(out).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(out).toContain("<!-- note -->");
  });

  it("reports mismatched tags with line and column", () =>
    expect(formatXml("<a>\n  <b></a>")).toEqual({
      ok: false,
      error: {
        message: "Expected closing tag 'b' (opened in line 2, col 3) instead of closing tag 'a'.",
        line: 2,
        column: 6,
      },
    }));

  it("rejects text that is not XML", () => expect(formatXml("hello").ok).toBe(false));

  it("indents with the chosen width or tabs", () => {
    const input = "<a><b>t</b></a>";
    expect(formatXml(input, { indent: "4" })).toEqual({ ok: true, output: "<a>\n    <b>t</b>\n</a>" });
    expect(formatXml(input, { indent: "tab" })).toEqual({ ok: true, output: "<a>\n\t<b>t</b>\n</a>" });
  });
});
