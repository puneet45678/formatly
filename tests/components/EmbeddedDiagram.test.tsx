import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { FormatId, FormatOutcome, FormatSettings } from "@/formats/types";

// jsdom can't draw Mermaid, so the formatter is replaced; what's tested here is
// how the preview finds diagram blocks and shows each outcome.
const runFormatter = vi.fn<(id: FormatId, input: string, settings: FormatSettings) => Promise<FormatOutcome>>();
vi.mock("@/formats/runFormatter", () => ({ runFormatter: (...args: Parameters<typeof runFormatter>) => runFormatter(...args) }));

import { MarkdownPreview } from "@/components/MarkdownPreview";

const fence = (lang: string, body: string) => "```" + lang + "\n" + body + "\n```\n";

function deferred() {
  let resolve!: (o: FormatOutcome) => void;
  const promise = new Promise<FormatOutcome>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  runFormatter.mockReset();
  runFormatter.mockImplementation(async (_id, input) => ({ kind: "ok", output: `<svg data-testid="drawn"><text>${input.trim()}</text></svg>` }));
});
afterEach(() => vi.useRealTimers());

describe("diagrams inside Markdown", () => {
  it("draws a ```mermaid block through the Mermaid format", async () => {
    render(<MarkdownPreview source={"# Flow\n\n" + fence("mermaid", "graph TD; A-->B")} />);
    expect(await screen.findByRole("img", { name: "Mermaid diagram" })).toBeInTheDocument();
    expect(screen.getByTestId("drawn")).toHaveTextContent("graph TD; A-->B");
    expect(runFormatter).toHaveBeenCalledWith("mermaid", "graph TD; A-->B\n", {});
  });

  it("leaves other code blocks as code", async () => {
    const { container } = render(<MarkdownPreview source={fence("js", "let a = 1;") + fence("", "plain")} />);
    expect(container.querySelectorAll("pre code")).toHaveLength(2);
    expect(container.querySelector("pre code")).toHaveTextContent("let a = 1;");
    expect(runFormatter).not.toHaveBeenCalled();
  });

  it("shows the source while drawing", async () => {
    const pending = deferred();
    runFormatter.mockReturnValueOnce(pending.promise);
    const { container } = render(<MarkdownPreview source={fence("mermaid", "graph TD; A-->B")} />);
    expect(container.querySelector("pre code")).toHaveTextContent("graph TD; A-->B");
    await act(async () => pending.resolve({ kind: "ok", output: '<svg data-testid="drawn"></svg>' }));
    expect(screen.getByTestId("drawn")).toBeInTheDocument();
  });

  it("keeps an invalid diagram's source and says what's wrong, without breaking the rest", async () => {
    runFormatter.mockResolvedValueOnce({ kind: "invalid", error: { message: "The diagram ends before it is complete", line: 2 } });
    const { container } = render(<MarkdownPreview source={"Before\n\n" + fence("mermaid", "graph TD\n  A-->") + "\nAfter"} />);
    expect(await screen.findByText("Mermaid diagram, line 2: The diagram ends before it is complete")).toBeInTheDocument();
    expect(container.querySelector("pre code")).toHaveTextContent("A-->");
    expect(screen.getByText("Before")).toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
  });

  it("explains a diagram that is too large to draw", async () => {
    runFormatter.mockResolvedValueOnce({ kind: "failed", reason: "too-complex", message: "This diagram is too large to draw" });
    render(<MarkdownPreview source={fence("mermaid", "graph TD; A-->B")} />);
    expect(await screen.findByText("Mermaid diagram not drawn: This diagram is too large to draw")).toBeInTheDocument();
  });

  it("draws several diagrams one at a time, never two at once", async () => {
    let running = 0;
    let most = 0;
    runFormatter.mockImplementation(async (_id, input) => {
      running++;
      most = Math.max(most, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return { kind: "ok", output: `<svg data-testid="drawn"><text>${input.trim()}</text></svg>` };
    });
    render(<MarkdownPreview source={["A-->B", "C-->D", "E-->F"].map((d) => fence("mermaid", `graph TD; ${d}`)).join("\n")} />);
    await waitFor(() => expect(screen.getAllByTestId("drawn")).toHaveLength(3));
    expect(most).toBe(1);
  });

  it("keeps the previous drawing while an edited diagram redraws", async () => {
    const { rerender } = render(<MarkdownPreview source={fence("mermaid", "graph TD; A-->B")} />);
    expect(await screen.findByTestId("drawn")).toHaveTextContent("A-->B");

    const pending = deferred();
    runFormatter.mockReturnValueOnce(pending.promise);
    rerender(<MarkdownPreview source={fence("mermaid", "graph TD; A-->C")} />);
    // No flash of source code: the old drawing stays until the new one is ready.
    expect(screen.getByTestId("drawn")).toHaveTextContent("A-->B");
    await act(async () => pending.resolve({ kind: "ok", output: '<svg data-testid="drawn"><text>new</text></svg>' }));
    expect(screen.getByTestId("drawn")).toHaveTextContent("new");
  });

  it("never lets an older drawing replace a newer one", async () => {
    const slow = deferred();
    runFormatter.mockReturnValueOnce(slow.promise);
    const { rerender } = render(<MarkdownPreview source={fence("mermaid", "graph TD; OLD")} />);
    rerender(<MarkdownPreview source={fence("mermaid", "graph TD; NEW")} />);
    await act(async () => slow.resolve({ kind: "ok", output: '<svg data-testid="drawn"><text>OLD</text></svg>' }));
    await waitFor(() => expect(screen.getByTestId("drawn")).toHaveTextContent("graph TD; NEW"));
  });
});
