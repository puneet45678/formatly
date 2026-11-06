import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorView } from "@codemirror/view";
import type { FormatId, FormatResult, FormatSettings } from "@/formats/types";
import { WorkbenchProvider } from "@/state/WorkbenchContext";

const runFormatter = vi.fn<(id: FormatId, input: string, settings: FormatSettings) => Promise<FormatResult>>();
vi.mock("@/formats/runFormatter", () => ({ runFormatter: (...args: Parameters<typeof runFormatter>) => runFormatter(...args) }));

import { Workbench } from "@/components/Workbench";

function renderWorkbench(formatId: FormatId) {
  return render(
    <WorkbenchProvider>
      <Workbench formatId={formatId} />
    </WorkbenchProvider>,
  );
}

// A plain selector, so the pane can still be found while expanded output hides it.
const inputPane = () => document.querySelector('section[aria-label="Input"]') as HTMLElement;
const outputPane = () => screen.getByRole("region", { name: "Output" });

/** Types into the input editor the way a real edit does, through CodeMirror. */
function typeInput(text: string) {
  const content = inputPane().querySelector(".cm-content") as HTMLElement;
  const view = EditorView.findFromDOM(content)!;
  act(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } }));
}

beforeEach(() => {
  runFormatter.mockReset();
  runFormatter.mockImplementation(async (_id, input) => ({ ok: true, output: `formatted:${input}` }));
});

describe("Workbench", () => {
  it("labels the input pane with the format", () => {
    renderWorkbench("yaml");
    expect(within(inputPane()).getByText("Input · YAML")).toBeInTheDocument();
  });

  it("shows the empty hint", () => {
    renderWorkbench("yaml");
    expect(within(outputPane()).getByText("Paste YAML on the left")).toBeInTheDocument();
  });

  it("shows Valid and output after typing", async () => {
    renderWorkbench("json");
    typeInput('{"a":1}');
    expect(await within(outputPane()).findByText("Valid")).toBeInTheDocument();
    expect(outputPane().querySelector(".cm-content")).toHaveTextContent('formatted:{"a":1}');
  });

  it("shows the error with line and column", async () => {
    runFormatter.mockResolvedValue({ ok: false, error: { message: "Unexpected token", line: 3, column: 5 } });
    renderWorkbench("json");
    typeInput("a\nb\nc");
    expect(await within(outputPane()).findByText("Line 3, column 5: Unexpected token")).toBeInTheDocument();
    expect(within(outputPane()).getByText("Error")).toBeInTheDocument();
    expect(inputPane().querySelector(".cm-error-line")).toHaveTextContent("c");
  });

  it("announces status and errors to screen readers", async () => {
    runFormatter.mockResolvedValue({ ok: false, error: { message: "Bad", line: 2 } });
    renderWorkbench("json");
    typeInput("a\nb");
    const message = await within(outputPane()).findByText("Line 2: Bad");
    expect(message.closest("[aria-live=polite]")).not.toBeNull();
    expect(within(outputPane()).getByText("Error").closest("[aria-live=polite]")).not.toBeNull();
  });

  it("shows line only when column is missing", async () => {
    runFormatter.mockResolvedValue({ ok: false, error: { message: "Bad", line: 3 } });
    renderWorkbench("json");
    typeInput("a\nb\nc");
    expect(await within(outputPane()).findByText("Line 3: Bad")).toBeInTheDocument();
  });

  it("Clear empties the input", async () => {
    renderWorkbench("json");
    typeInput("{}");
    await userEvent.click(within(inputPane()).getByRole("button", { name: "Clear" }));
    // The CodeMirror wrapper applies outside changes once the typing pause (~200ms) ends.
    await waitFor(() => expect(inputPane().querySelector(".cm-content")).not.toHaveTextContent("{}"));
    expect(within(outputPane()).getByText("Paste JSON on the left")).toBeInTheDocument();
  });

  it("shows the dialect picker only for SQL", () => {
    const { unmount } = renderWorkbench("sql");
    const picker = screen.getByRole("combobox", { name: "SQL dialect" });
    expect(within(picker).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Standard",
      "SQL Server",
      "PostgreSQL",
      "MySQL",
    ]);
    unmount();
    renderWorkbench("json");
    expect(screen.queryByRole("combobox", { name: "SQL dialect" })).toBeNull();
  });

  it("passes the chosen dialect to the formatter", async () => {
    renderWorkbench("sql");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "SQL dialect" }), "PostgreSQL");
    typeInput("select 1");
    await within(outputPane()).findByText("Valid");
    expect(runFormatter).toHaveBeenLastCalledWith("sql", "select 1", { dialect: "postgresql" });
  });

  it("renders a diagram for mermaid", async () => {
    runFormatter.mockResolvedValue({ ok: true, output: '<svg data-testid="d"></svg>' });
    renderWorkbench("mermaid");
    typeInput("graph TD; A-->B");
    expect(await within(outputPane()).findByTestId("d")).toBeInTheDocument();
    expect(outputPane().querySelector(".cm-editor")).toBeNull();
  });

  it("expands the output over the input and back", async () => {
    renderWorkbench("json");
    typeInput('{"a":1}');
    await userEvent.click(within(outputPane()).getByRole("button", { name: "Expand output" }));
    expect(inputPane()).not.toBeVisible();
    await userEvent.click(within(outputPane()).getByRole("button", { name: "Exit expanded output" }));
    expect(inputPane()).toBeVisible();
    expect(inputPane().querySelector(".cm-content")).toHaveTextContent('{"a":1}');
  });

  it("leaves expanded output with Esc", async () => {
    renderWorkbench("json");
    await userEvent.click(within(outputPane()).getByRole("button", { name: "Expand output" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(inputPane()).toBeVisible();
  });

  it("remembers the format", () => {
    renderWorkbench("xml");
    expect(localStorage.getItem("formatly:lastFormat")).toBe("xml");
  });
});
