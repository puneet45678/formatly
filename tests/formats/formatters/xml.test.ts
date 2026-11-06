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

  describe("whitespace inside elements is data", () => {
    const out = (xml: string) => (formatXml(xml) as { output: string }).output;

    it("keeps an element that holds only a tab", () =>
      expect(out("<cfg><delim>\t</delim></cfg>")).toBe("<cfg>\n  <delim>\t</delim>\n</cfg>"));

    it("keeps an element that holds only a space", () =>
      expect(out("<a><sep> </sep></a>")).toBe("<a>\n  <sep> </sep>\n</a>"));

    it("keeps leading and trailing spaces in multi-line text", () =>
      expect(out("<a><pre>  x\n   y  </pre></a>")).toBe("<a>\n  <pre>  x\n   y  </pre>\n</a>"));

    it("still indents elements that only contain other elements", () =>
      expect(out("<a>\n<b>x</b>\n  <c>\n<d/></c>\n</a>")).toBe("<a>\n  <b>x</b>\n  <c>\n    <d/>\n  </c>\n</a>"));

    it("is stable when formatted again", () => {
      const once = out("<cfg><delim>\t</delim><pre>  x\n y </pre></cfg>");
      expect(out(once)).toBe(once);
    });

    it("leaves text alone when it already contains the private placeholder character", () =>
      expect(formatXml("<a><b>\uE000 </b></a>")).toMatchObject({ ok: true }));
  });
});
