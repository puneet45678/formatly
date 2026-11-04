import { describe, expect, it } from "vitest";
import { act, fireEvent, renderHook } from "@testing-library/react";
import { WorkbenchProvider, rememberFormat, useWorkbench } from "@/state/WorkbenchContext";

function renderWorkbench() {
  return renderHook(() => useWorkbench(), { wrapper: WorkbenchProvider });
}

describe("WorkbenchContext", () => {
  it("starts with empty inputs", () => {
    const { result } = renderWorkbench();
    expect(result.current.inputs).toEqual({ json: "", yaml: "", mermaid: "", xml: "", sql: "", markdown: "" });
  });

  it("keeps each format input separate", () => {
    const { result } = renderWorkbench();
    act(() => result.current.setInput("json", "{}"));
    act(() => result.current.setInput("yaml", "a: 1"));
    expect(result.current.inputs.json).toBe("{}");
    expect(result.current.inputs.yaml).toBe("a: 1");
  });

  it('defaults sql dialect to "sql"', () => {
    const { result } = renderWorkbench();
    expect(result.current.sqlDialect).toBe("sql");
  });

  it("restores a stored dialect", () => {
    localStorage.setItem("formatly:sqlDialect", "postgresql");
    const { result } = renderWorkbench();
    expect(result.current.sqlDialect).toBe("postgresql");
  });

  it("ignores an unknown stored dialect", () => {
    localStorage.setItem("formatly:sqlDialect", "oracle");
    const { result } = renderWorkbench();
    expect(result.current.sqlDialect).toBe("sql");
  });

  it("persists dialect changes", () => {
    const { result } = renderWorkbench();
    act(() => result.current.setSqlDialect("mysql"));
    expect(result.current.sqlDialect).toBe("mysql");
    expect(localStorage.getItem("formatly:sqlDialect")).toBe("mysql");
  });

  it("never writes input text to storage", () => {
    const { result } = renderWorkbench();
    act(() => result.current.setInput("json", '{"secret":"s3cr3t"}'));
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      expect(key.startsWith("formatly:")).toBe(true);
      expect(localStorage.getItem(key)).not.toContain("s3cr3t");
    }
  });

  it("starts with the format menu expanded", () => {
    const { result } = renderWorkbench();
    expect(result.current.railCollapsed).toBe(false);
  });

  it("toggles the format menu and remembers it", () => {
    const { result } = renderWorkbench();
    act(() => result.current.toggleRail());
    expect(result.current.railCollapsed).toBe(true);
    expect(localStorage.getItem("formatly:railCollapsed")).toBe("true");
    act(() => result.current.toggleRail());
    expect(result.current.railCollapsed).toBe(false);
    expect(localStorage.getItem("formatly:railCollapsed")).toBe("false");
  });

  it("restores a collapsed format menu", () => {
    localStorage.setItem("formatly:railCollapsed", "true");
    const { result } = renderWorkbench();
    expect(result.current.railCollapsed).toBe(true);
  });

  it("ignores a garbage stored menu state", () => {
    localStorage.setItem("formatly:railCollapsed", "yes please");
    const { result } = renderWorkbench();
    expect(result.current.railCollapsed).toBe(false);
  });

  it("toggles the format menu with Cmd/Ctrl+\\", () => {
    const { result } = renderWorkbench();
    act(() => void fireEvent.keyDown(window, { key: "\\", metaKey: true }));
    expect(result.current.railCollapsed).toBe(true);
    act(() => void fireEvent.keyDown(window, { key: "\\", ctrlKey: true }));
    expect(result.current.railCollapsed).toBe(false);
  });

  it("ignores a plain backslash", () => {
    const { result } = renderWorkbench();
    act(() => void fireEvent.keyDown(window, { key: "\\" }));
    expect(result.current.railCollapsed).toBe(false);
  });

  it("rememberFormat stores the last format", () => {
    rememberFormat("xml");
    expect(localStorage.getItem("formatly:lastFormat")).toBe("xml");
  });
});
