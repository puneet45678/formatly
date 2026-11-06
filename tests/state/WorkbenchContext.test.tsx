import { describe, expect, it } from "vitest";
import { act, fireEvent, renderHook } from "@testing-library/react";
import { FORMATS } from "@/formats/registry";
import { WorkbenchProvider, rememberFormat, useWorkbench } from "@/state/WorkbenchContext";

function renderWorkbench() {
  return renderHook(() => useWorkbench(), { wrapper: WorkbenchProvider });
}

describe("WorkbenchContext", () => {
  it("starts with empty inputs", () => {
    const { result } = renderWorkbench();
    expect(result.current.inputs).toEqual(Object.fromEntries(FORMATS.map((f) => [f.id, ""])));
  });

  it("keeps each format input separate", () => {
    const { result } = renderWorkbench();
    act(() => result.current.setInput("json", "{}"));
    act(() => result.current.setInput("yaml", "a: 1"));
    expect(result.current.inputs.json).toBe("{}");
    expect(result.current.inputs.yaml).toBe("a: 1");
  });

  it("starts each format with its default settings", () => {
    const { result } = renderWorkbench();
    expect(result.current.settings.sql).toEqual({ dialect: "sql" });
    expect(result.current.settings.json).toEqual({});
  });

  it("changes and remembers a setting", () => {
    const { result } = renderWorkbench();
    act(() => result.current.setSetting("sql", "dialect", "mysql"));
    expect(result.current.settings.sql.dialect).toBe("mysql");
    expect(localStorage.getItem("formatly:settings:sql")).toBe('{"dialect":"mysql"}');
  });

  it("restores stored settings, ignoring bad ones", () => {
    localStorage.setItem("formatly:settings:sql", '{"dialect":"postgresql"}');
    localStorage.setItem("formatly:settings:json", "{oops");
    const { result, unmount } = renderWorkbench();
    expect(result.current.settings.sql).toEqual({ dialect: "postgresql" });
    expect(result.current.settings.json).toEqual({});
    unmount();

    localStorage.setItem("formatly:settings:sql", "{oops");
    expect(renderWorkbench().result.current.settings.sql).toEqual({ dialect: "sql" });
  });

  it("ignores an unknown stored dialect", () => {
    localStorage.setItem("formatly:settings:sql", '{"dialect":"oracle"}');
    const { result } = renderWorkbench();
    expect(result.current.settings.sql).toEqual({ dialect: "sql" });
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

  it("starts with the format capsule closed (symbols only)", () => {
    const { result } = renderWorkbench();
    expect(result.current.railCollapsed).toBe(true);
  });

  it("opens and closes the format capsule and remembers it", () => {
    const { result } = renderWorkbench();
    act(() => result.current.toggleRail());
    expect(result.current.railCollapsed).toBe(false);
    expect(localStorage.getItem("formatly:railCollapsed")).toBe("false");
    act(() => result.current.toggleRail());
    expect(result.current.railCollapsed).toBe(true);
    expect(localStorage.getItem("formatly:railCollapsed")).toBe("true");
  });

  it("restores an open format capsule", () => {
    localStorage.setItem("formatly:railCollapsed", "false");
    const { result } = renderWorkbench();
    expect(result.current.railCollapsed).toBe(false);
  });

  it("ignores a garbage stored capsule state", () => {
    localStorage.setItem("formatly:railCollapsed", "yes please");
    const { result } = renderWorkbench();
    expect(result.current.railCollapsed).toBe(true);
  });

  it("toggles the format capsule with Cmd/Ctrl+\\", () => {
    const { result } = renderWorkbench();
    act(() => void fireEvent.keyDown(window, { key: "\\", metaKey: true }));
    expect(result.current.railCollapsed).toBe(false);
    act(() => void fireEvent.keyDown(window, { key: "\\", ctrlKey: true }));
    expect(result.current.railCollapsed).toBe(true);
  });

  it("ignores a plain backslash", () => {
    const { result } = renderWorkbench();
    act(() => void fireEvent.keyDown(window, { key: "\\" }));
    expect(result.current.railCollapsed).toBe(true);
  });

  it("rememberFormat stores the last format", () => {
    rememberFormat("xml");
    expect(localStorage.getItem("formatly:lastFormat")).toBe("xml");
  });

  it("starts with an even split and the input open", () => {
    const { result } = renderWorkbench();
    expect(result.current.layout).toEqual({ inputFraction: 0.5, inputCollapsed: false });
  });

  it("changes the layout and remembers it", () => {
    const { result } = renderWorkbench();
    act(() => result.current.setLayout({ inputFraction: 0.3, inputCollapsed: true }));
    expect(result.current.layout).toEqual({ inputFraction: 0.3, inputCollapsed: true });
    expect(JSON.parse(localStorage.getItem("formatly:layout")!)).toEqual({ inputFraction: 0.3, inputCollapsed: true });
  });

  it("restores a stored layout", () => {
    localStorage.setItem("formatly:layout", '{"inputFraction":0.35,"inputCollapsed":true}');
    const { result } = renderWorkbench();
    expect(result.current.layout).toEqual({ inputFraction: 0.35, inputCollapsed: true });
  });

  it("ignores a corrupt stored layout", () => {
    for (const bad of ["{oops", '{"inputFraction":9}', "null", '"x"', '{"inputFraction":"0.3"}']) {
      localStorage.setItem("formatly:layout", bad);
      const { result, unmount } = renderWorkbench();
      expect(result.current.layout).toEqual({ inputFraction: 0.5, inputCollapsed: false });
      unmount();
    }
  });
});
