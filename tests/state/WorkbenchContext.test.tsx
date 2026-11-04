import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { WorkbenchProvider, rememberFormat, useWorkbench } from "@/state/WorkbenchContext";

let api: ReturnType<typeof useWorkbench>;

function Probe() {
  api = useWorkbench();
  return (
    <>
      <span data-testid="dialect">{api.sqlDialect}</span>
      <span data-testid="json">{api.inputs.json}</span>
      <span data-testid="yaml">{api.inputs.yaml}</span>
    </>
  );
}

function renderProvider() {
  return render(
    <WorkbenchProvider>
      <Probe />
    </WorkbenchProvider>,
  );
}

describe("WorkbenchContext", () => {
  it("starts with empty inputs", () => {
    renderProvider();
    expect(api.inputs).toEqual({ json: "", yaml: "", mermaid: "", xml: "", sql: "", markdown: "" });
  });

  it("keeps each format input separate", () => {
    renderProvider();
    act(() => api.setInput("json", "{}"));
    act(() => api.setInput("yaml", "a: 1"));
    expect(screen.getByTestId("json")).toHaveTextContent("{}");
    expect(screen.getByTestId("yaml")).toHaveTextContent("a: 1");
  });

  it('defaults sql dialect to "sql"', () => {
    renderProvider();
    expect(screen.getByTestId("dialect")).toHaveTextContent("sql");
  });

  it("restores a stored dialect", () => {
    localStorage.setItem("formatly:sqlDialect", "postgresql");
    renderProvider();
    expect(screen.getByTestId("dialect")).toHaveTextContent("postgresql");
  });

  it("ignores an unknown stored dialect", () => {
    localStorage.setItem("formatly:sqlDialect", "oracle");
    renderProvider();
    expect(screen.getByTestId("dialect")).toHaveTextContent("sql");
  });

  it("persists dialect changes", () => {
    renderProvider();
    act(() => api.setSqlDialect("mysql"));
    expect(screen.getByTestId("dialect")).toHaveTextContent("mysql");
    expect(localStorage.getItem("formatly:sqlDialect")).toBe("mysql");
  });

  it("never writes input text to storage", () => {
    renderProvider();
    act(() => api.setInput("json", '{"secret":"s3cr3t"}'));
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      expect(key.startsWith("formatly:")).toBe(true);
      expect(localStorage.getItem(key)).not.toContain("s3cr3t");
    }
  });

  it("rememberFormat stores the last format", () => {
    rememberFormat("xml");
    expect(localStorage.getItem("formatly:lastFormat")).toBe("xml");
  });
});
