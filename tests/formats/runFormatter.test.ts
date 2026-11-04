import { describe, expect, it } from "vitest";
import { PLACEHOLDER_SVG, runFormatter } from "@/formats/runFormatter";

describe("runFormatter (phase 1 stub)", () => {
  it("echoes text formats", async () => {
    await expect(runFormatter("json", '{"a":1}')).resolves.toEqual({ ok: true, output: '{"a":1}' });
  });

  it("returns the placeholder diagram for mermaid", async () => {
    await expect(runFormatter("mermaid", "graph TD; A-->B")).resolves.toEqual({ ok: true, output: PLACEHOLDER_SVG });
    expect(PLACEHOLDER_SVG).toContain("<svg");
    expect(PLACEHOLDER_SVG).toContain("Diagram preview (phase 2)");
  });
});
