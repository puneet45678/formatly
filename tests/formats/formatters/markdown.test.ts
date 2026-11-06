import { describe, expect, it } from "vitest";
import { formatMarkdown } from "@/formats/formatters/markdown";

describe("formatMarkdown", () => {
  it("normalizes Markdown", async () =>
    expect(await formatMarkdown("# T\n* one\n* two\n\n__bold__")).toEqual({
      ok: true,
      output: "# T\n\n- one\n- two\n\n**bold**\n",
    }));

  it("keeps links and text", async () => {
    const result = await formatMarkdown("Visit [a link](https://x.dev) now");
    expect(result).toEqual({ ok: true, output: "Visit [a link](https://x.dev) now\n" });
  });
});
