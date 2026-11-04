import { beforeEach, describe, expect, it, vi } from "vitest";

// jsdom can't measure text, so real Mermaid can't run here. We replace it with
// fakes and test only our own code: setup, error mapping and cleanup.
const mock = vi.hoisted(() => ({ initialize: vi.fn(), parse: vi.fn(), render: vi.fn() }));
vi.mock("mermaid", () => ({ default: mock }));

type MermaidModule = typeof import("@/formats/formatters/mermaid");

// The module remembers "already initialized" and a render counter, so give every test a fresh copy.
async function freshModule(): Promise<MermaidModule> {
  vi.resetModules();
  return import("@/formats/formatters/mermaid");
}

beforeEach(() => {
  mock.initialize.mockReset();
  mock.parse.mockReset().mockResolvedValue(true);
  mock.render.mockReset().mockResolvedValue({ svg: "<svg></svg>" });
  document.body.innerHTML = "";
});

describe("renderMermaid", () => {
  it("initializes once with strict security and a dark theme", async () => {
    const { renderMermaid } = await freshModule();
    await renderMermaid("graph TD; A-->B");
    await renderMermaid("graph TD; B-->C");
    expect(mock.initialize).toHaveBeenCalledTimes(1);
    expect(mock.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ startOnLoad: false, securityLevel: "strict", theme: "dark" }),
    );
  });

  it("returns the rendered SVG", async () => {
    mock.render.mockResolvedValue({ svg: "<svg>diagram</svg>" });
    const { renderMermaid } = await freshModule();
    expect(await renderMermaid("graph TD; A-->B")).toEqual({ ok: true, output: "<svg>diagram</svg>" });
    expect(mock.parse).toHaveBeenCalledWith("graph TD; A-->B");
    expect(mock.render).toHaveBeenCalledWith(expect.stringMatching(/^formatly-mermaid-\d+$/), "graph TD; A-->B");
  });

  it("reports syntax errors with the line from the parser", async () => {
    mock.parse.mockRejectedValue(
      Object.assign(new Error("Parse error on line 3:\n...A-->\n-----^\nExpected NODE"), {
        hash: { loc: { first_line: 3, first_column: 4 } },
      }),
    );
    const { renderMermaid } = await freshModule();
    expect(await renderMermaid("graph TD\nA\nA-->")).toEqual({
      ok: false,
      error: { message: "Parse error on line 3:", line: 3, column: 5 },
    });
    expect(mock.render).not.toHaveBeenCalled();
  });

  it("falls back to the line in the message", async () => {
    mock.parse.mockRejectedValue(new Error("Lexical error on line 2. Unrecognized text."));
    const { renderMermaid } = await freshModule();
    expect(await renderMermaid("x")).toEqual({
      ok: false,
      error: { message: "Lexical error on line 2. Unrecognized text.", line: 2 },
    });
  });

  it("falls back to line 1", async () => {
    mock.parse.mockRejectedValue(new Error("Something odd"));
    const { renderMermaid } = await freshModule();
    expect(await renderMermaid("x")).toEqual({ ok: false, error: { message: "Something odd", line: 1 } });
  });

  it("copes with errors that are not Error objects", async () => {
    mock.parse.mockRejectedValue("boom");
    const { renderMermaid } = await freshModule();
    expect(await renderMermaid("x")).toEqual({ ok: false, error: { message: "boom", line: 1 } });
  });

  it("cleans up after a failed render", async () => {
    // A failed Mermaid render can leave its scratch elements in the page.
    mock.render.mockImplementation(async (id: string) => {
      for (const elementId of [`d${id}`, id]) {
        const el = document.createElement("div");
        el.id = elementId;
        document.body.appendChild(el);
      }
      throw new Error("render failed");
    });
    const { renderMermaid } = await freshModule();
    const result = await renderMermaid("graph TD; A-->B");
    expect(result.ok).toBe(false);
    expect(document.body.children).toHaveLength(0);
  });

  it("uses a fresh element id for each render", async () => {
    const { renderMermaid } = await freshModule();
    await renderMermaid("graph TD; A-->B");
    await renderMermaid("graph TD; A-->B");
    const [first, second] = mock.render.mock.calls.map((call) => call[0]);
    expect(first).not.toBe(second);
  });
});

describe("mermaidErrorPosition", () => {
  it("turns the parser's 0-based column into a 1-based one", async () => {
    const { mermaidErrorPosition } = await freshModule();
    const err = { message: "x", hash: { loc: { first_line: 2, first_column: 0 } } };
    expect(mermaidErrorPosition(err)).toEqual({ line: 2, column: 1 });
  });
});
