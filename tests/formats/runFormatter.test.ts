import { describe, expect, it } from "vitest";
import { runFormatter } from "@/formats/runFormatter";
import { PLACEHOLDER_SVG } from "@/formats/formatters/echo";

describe("runFormatter (stub formatters until each real one lands)", () => {
  it("echoes text formats", async () => {
    await expect(runFormatter("json", '{"a":1}', {})).resolves.toEqual({ ok: true, output: '{"a":1}' });
  });

  it("returns the placeholder diagram for mermaid", async () => {
    await expect(runFormatter("mermaid", "graph TD; A-->B", {})).resolves.toEqual({ ok: true, output: PLACEHOLDER_SVG });
    expect(PLACEHOLDER_SVG).toContain("<svg");
    expect(PLACEHOLDER_SVG).toContain("Diagram preview (phase 2)");
  });
});
