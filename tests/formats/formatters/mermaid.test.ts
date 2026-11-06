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

  const FIVE_LINES = "a\nb\nc\nd\ne"; // long enough that the fake positions below point inside it

  // Shaped like real jison parser errors: Error(message) with hash = { text, token, line, loc, expected }.
  const jisonError = (message: string, hash: object) => Object.assign(new Error(message), { hash });

  it("says the diagram ends early when the parser hits EOF", async () => {
    mock.parse.mockRejectedValue(
      jisonError("Parse error on line 2:\ngraph TD; A-->\n--------------^\nExpecting 'AMP', 'SEMI', got 'EOF'", {
        token: "EOF",
        text: "",
        expected: ["'AMP'", "'SEMI'"],
        loc: { first_line: 1, first_column: 11 },
      }),
    );
    const { renderMermaid } = await freshModule();
    expect(await renderMermaid("graph TD; A-->")).toEqual({
      ok: false,
      error: { message: "The diagram ends before it is complete", line: 1, column: 12 },
    });
    expect(mock.render).not.toHaveBeenCalled();
  });

  it("names the unexpected text instead of Mermaid's header line", async () => {
    mock.parse.mockRejectedValue(
      jisonError("Parse error on line 5:\n...\n-----^\nExpecting 'SQE', got 'PS'", {
        token: "PS",
        text: "[",
        loc: { first_line: 3, first_column: 10 },
      }),
    );
    const { renderMermaid } = await freshModule();
    expect(await renderMermaid(FIVE_LINES)).toEqual({
      ok: false,
      error: { message: 'Unexpected "["', line: 3, column: 11 },
    });
  });

  it("uses the Expecting line when there is no hash", async () => {
    mock.parse.mockRejectedValue(new Error("Parse error on line 2:\nA--\n--^\nExpecting 'X', got 'Y'\n"));
    const { renderMermaid } = await freshModule();
    expect(await renderMermaid(FIVE_LINES)).toEqual({
      ok: false,
      error: { message: "Expecting 'X', got 'Y'", line: 2 },
    });
  });

  it("detects EOF from the message when the hash has no token", async () => {
    mock.parse.mockRejectedValue(jisonError("Parse error on line 1:\nA\n^\nExpecting 'X', got 'EOF'", {}));
    const { renderMermaid } = await freshModule();
    expect(await renderMermaid(FIVE_LINES)).toEqual({
      ok: false,
      error: { message: "The diagram ends before it is complete", line: 1 },
    });
  });

  it("falls back to the line in the message", async () => {
    mock.parse.mockRejectedValue(new Error("Lexical error on line 2. Unrecognized text."));
    const { renderMermaid } = await freshModule();
    expect(await renderMermaid(FIVE_LINES)).toEqual({
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

// Mermaid drops frontmatter, `%%` comments, directives and leading blank lines before it parses, and
// reports lines of what is left. Each case: a source, the loc real Mermaid 12 reported for it (probed
// against the real parser), and the line the error is really on.
describe("mermaidErrorPosition with the original source", () => {
  const cases: [string, string, { first_line: number; first_column: number }, number][] = [
    ["frontmatter", "---\ntitle: Hello\n---\ngraph TD\n  A-->B\n  B-->", { first_line: 3, first_column: 3 }, 6],
    ["leading comments", "%% my diagram\n%% second\ngraph TD\n  A-->B\n  B-->", { first_line: 3, first_column: 3 }, 5],
    ["comments inside", "graph TD\n  A-->B\n%% c1\n%% c2\n  B--> C(]", { first_line: 3, first_column: 8 }, 5],
    ["leading blank lines", "\n\n\ngraph TD\n  A-->B\n  B-->", { first_line: 3, first_column: 3 }, 6],
    ["leading directive", "%%{init: {'theme':'dark'}}%%\ngraph TD\n  A-->B\n  B-->", { first_line: 3, first_column: 3 }, 4],
    ["directive in the middle", "graph TD\n  A-->B\n%%{init: {'theme':'dark'}}%%\n  B-->", { first_line: 4, first_column: 3 }, 4],
    ["blank line before a comment", "graph TD\n  A-->B\n\n%% c\n  B-->", { first_line: 3, first_column: 3 }, 5],
    ["Windows line endings", "graph TD\r\n  A-->B\r\n%% c\r\n  B-->", { first_line: 3, first_column: 3 }, 4],
    ["nothing removed", "graph TD\n  A-->B\n  B-->", { first_line: 3, first_column: 3 }, 3],
  ];

  it.each(cases)("maps the line back past removed lines: %s", async (_name, source, loc, line) => {
    const { mermaidErrorPosition } = await freshModule();
    expect(mermaidErrorPosition({ message: "x", hash: { loc } }, source)).toEqual({ line, column: loc.first_column + 1 });
  });

  it("maps the 'line N' fallback too", async () => {
    const { mermaidErrorPosition } = await freshModule();
    const source = "---\ntitle: t\n---\ngraph TD\n  A-->B";
    expect(mermaidErrorPosition(new Error("Lexical error on line 2. Unrecognized text."), source)).toEqual({ line: 5 });
  });

  it("keeps the line when no source is given", async () => {
    const { mermaidErrorPosition } = await freshModule();
    expect(mermaidErrorPosition({ message: "x", hash: { loc: { first_line: 3, first_column: 0 } } })).toEqual({ line: 3, column: 1 });
  });

  it("renderMermaid reports the line in the original text", async () => {
    mock.parse.mockRejectedValue(
      Object.assign(new Error("Parse error"), { hash: { token: "EOF", text: "", loc: { first_line: 2, first_column: 3 } } }),
    );
    const { renderMermaid } = await freshModule();
    expect(await renderMermaid("%% note\ngraph TD\n  B-->")).toMatchObject({ ok: false, error: { line: 3 } });
  });
});
