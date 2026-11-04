import { describe, expect, it, vi } from "vitest";
import { runFormatter } from "@/formats/runFormatter";
import { echo, PLACEHOLDER_SVG } from "@/formats/formatters/echo";
import { yaml } from "@/formats/definitions/yaml";

describe("runFormatter (stub formatters until each real one lands)", () => {
  it("echoes text formats that still use the stand-in", async () => {
    // Point yaml's load at the echo stand-in, so this test doesn't depend on
    // which formats are still stubs. Restored afterwards.
    const load = vi.spyOn(yaml, "load").mockResolvedValue(echo);
    try {
      await expect(runFormatter("yaml", "a: 1", {})).resolves.toEqual({ ok: true, output: "a: 1" });
      expect(load).toHaveBeenCalled();
    } finally {
      load.mockRestore();
    }
  });

  it("returns the placeholder diagram for mermaid", async () => {
    await expect(runFormatter("mermaid", "graph TD; A-->B", {})).resolves.toEqual({ ok: true, output: PLACEHOLDER_SVG });
    expect(PLACEHOLDER_SVG).toContain("<svg");
    expect(PLACEHOLDER_SVG).toContain("Diagram preview (phase 2)");
  });
});
