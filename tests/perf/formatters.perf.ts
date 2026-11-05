import { describe, expect, test } from "vitest";
import { formatInput } from "@/formats/formatInput";
import { defaultSettings } from "@/formats/registry";
import type { FormatId } from "@/formats/types";
import { FIXTURES } from "./fixtures";

// Regression tripwires, not product targets. Each budget is about 3x the time
// measured on a dev container (Nov 2026), so a slower CI runner still passes,
// while a real regression (a dependency bump, an O(n^2) path coming back)
// fails the build.
//
// Measured medians, Node 22, for reference:
//   json      256KB=41ms   512KB=51ms    1MB=99ms
//   yaml      256KB=321ms  512KB=603ms   1MB=1120ms
//   xml       256KB=52ms   512KB=66ms    1MB=105ms    was 191/754/3091 ms (quadratic) before patches/xml-parser-xo
//   sql       256KB=759ms  512KB=1672ms  1MB=5366ms   superlinear
//   markdown  256KB=1889ms 512KB=4230ms  1MB=13123ms  superlinear, near the 15 s worker timeout
//
// Sizes differ per format on purpose: budgets sit where each format is still
// fast enough to be worth guarding, instead of at a size that already times out.

const KB = 1024;

type Budget = { format: FormatId & keyof typeof FIXTURES; bytes: number; maxMs: number };

const BUDGETS: Budget[] = [
  { format: "json", bytes: 1024 * KB, maxMs: 500 },
  { format: "yaml", bytes: 512 * KB, maxMs: 2_000 },
  // The unpatched parser takes ~757 ms here, so this also guards patches/xml-parser-xo+4.1.6.patch.
  { format: "xml", bytes: 512 * KB, maxMs: 300 },
  { format: "sql", bytes: 256 * KB, maxMs: 2_500 },
  { format: "markdown", bytes: 256 * KB, maxMs: 6_000 },
];

/** Median wall time of `runs` calls, after one small warm-up call that loads the formatter's library. */
async function medianMs(format: FormatId, input: string, runs = 3): Promise<number> {
  const settings = defaultSettings(format);
  await formatInput(format, input.slice(0, 2_000), settings);
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    const result = await formatInput(format, input, settings);
    times.push(performance.now() - start);
    expect(result.kind, `${format} fixture should format without errors`).toBe("ok");
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)];
}

describe("regression guards", () => {
  // formatters/json.ts replaces jsonc-parser's applyEdits (O(n^2)) with a single
  // pass. At 256 KB the single pass takes about 15 ms and the quadratic version
  // about 5,700 ms, so a 500 ms budget can't flake and still fails within seconds.
  // It runs first: with `bail: 1`, a quadratic regression stops the suite here
  // instead of hanging on the 1 MB budget below. (A timeout can't interrupt
  // synchronous code, which is also why workerClient kills the worker.)
  //
  // A doubling-ratio check (t(2n) / t(n)) was tried and rejected: at these sizes
  // the linear version's ratio ranged 1.2-3.2 from timer noise, and the quadratic
  // one measured only 3.3, so no threshold separates them.
  test("json: edits are applied in one pass (256 KB within 500 ms)", { timeout: 10_000 }, async () => {
    const ms = await medianMs("json", FIXTURES.json(256 * KB));
    expect(ms).toBeLessThan(500);
  });
});

describe("formatter time budgets", () => {
  for (const { format, bytes, maxMs } of BUDGETS) {
    test(`${format} formats ${bytes / KB} KB within ${maxMs} ms`, { timeout: 4 * maxMs }, async () => {
      const ms = await medianMs(format, FIXTURES[format](bytes));
      expect(ms).toBeLessThan(maxMs);
    });
  }
});
