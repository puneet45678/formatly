// Runs the real Mermaid parser (no mock) to check that error lines point at the text as typed.
// Only parse errors are exercised: they are reported before anything is drawn, so jsdom is enough.
import { expect, it } from "vitest";
import { renderMermaid } from "@/formats/formatters/mermaid";
const cases: [string, string, number][] = [
  ["fm", "---\ntitle: Hello\n---\ngraph TD\n  A-->B\n  B-->", 6],
  ["cm", "%% my diagram\n%% second\ngraph TD\n  A-->B\n  B-->", 5],
  ["cmInside", "graph TD\n  A-->B\n%% c1\n%% c2\n  B--> C(]", 5],
  ["lead", "\n\n\ngraph TD\n  A-->B\n  B-->", 6],
  ["dir", "%%{init: {'theme':'dark'}}%%\ngraph TD\n  A-->B\n  B-->", 4],
  ["dirMid", "graph TD\n  A-->B\n%%{init: {'theme':'dark'}}%%\n  B-->", 4],
  ["blankThenComment", "graph TD\n  A-->B\n\n%% c\n  B-->", 5],
  ["crlf", "graph TD\r\n  A-->B\r\n%% c\r\n  B-->", 4],
];
it.each(cases)("real mermaid: %s", async (_n, src, line) => {
  const r = await renderMermaid(src);
  expect(r).toMatchObject({ ok: false, error: { line } });
});
