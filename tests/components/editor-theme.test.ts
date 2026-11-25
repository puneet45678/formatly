import { describe, expect, it } from "vitest";
import { tags } from "@lezer/highlight";
import { highlightStyle } from "@/components/editor-theme";

// The Markdown parser tags bold, italic, links, code and the marks (#, **, -, >).
// Until the highlight style names them, they all render as plain grey text.
describe("highlightStyle", () => {
  const markdownTags = [
    ["heading", tags.heading1],
    ["bold", tags.strong],
    ["italic", tags.emphasis],
    ["link text", tags.link],
    ["url", tags.url],
    ["inline code", tags.monospace],
    ["quote", tags.quote],
    ["marks like # ** - >", tags.processingInstruction],
    ["rules like ---", tags.contentSeparator],
  ] as const;

  it.each(markdownTags)("styles Markdown %s", (_name, tag) => expect(highlightStyle.style([tag])).not.toBeNull());

  it("gives bold, italic and headings different looks from plain text and from each other", () => {
    const looks = [tags.strong, tags.emphasis, tags.heading1, tags.content].map((tag) => highlightStyle.style([tag]));
    expect(new Set(looks).size).toBe(looks.length);
  });

  it("keeps the colors of the other languages", () => {
    for (const tag of [tags.propertyName, tags.string, tags.number, tags.punctuation])
      expect(highlightStyle.style([tag])).not.toBeNull();
  });
});
