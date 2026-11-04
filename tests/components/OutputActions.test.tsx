import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { getFormat } from "@/formats/registry";
import type { OutputState } from "@/hooks/useFormattedOutput";

const downloadText = vi.fn();
const downloadBlob = vi.fn();
const svgToPngBlob = vi.fn(async () => new Blob(["png"], { type: "image/png" }));
vi.mock("@/lib/download", () => ({
  downloadText: (...a: unknown[]) => downloadText(...a),
  downloadBlob: (...a: unknown[]) => downloadBlob(...a),
  svgToPngBlob: (...a: unknown[]) => svgToPngBlob(...(a as [])),
}));

import { OutputActions } from "@/components/OutputActions";

const ok: OutputState = { status: "ok", output: "a: 1" };
const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  downloadText.mockReset();
  downloadBlob.mockReset();
});
afterEach(() => vi.useRealTimers());

const button = (name: string) => screen.getByRole("button", { name });

describe("OutputActions", () => {
  it("text formats show Copy and Download", () => {
    render(<OutputActions format={getFormat("json")} state={ok} />);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Copy", "Download"]);
  });

  it("mermaid shows Download SVG and Download PNG only", () => {
    render(<OutputActions format={getFormat("mermaid")} state={{ status: "ok", output: "<svg/>" }} />);
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Download SVG", "Download PNG"]);
  });

  it("actions are disabled unless status is ok", () => {
    const { rerender } = render(<OutputActions format={getFormat("json")} state={{ status: "empty" }} />);
    for (const b of screen.getAllByRole("button")) expect(b).toBeDisabled();
    rerender(<OutputActions format={getFormat("json")} state={{ status: "error", error: { message: "x", line: 1 } }} />);
    for (const b of screen.getAllByRole("button")) expect(b).toBeDisabled();
  });

  it("copies output and shows Copied for 1.5s", async () => {
    render(<OutputActions format={getFormat("yaml")} state={ok} />);
    await act(async () => fireEvent.click(button("Copy")));
    expect(writeText).toHaveBeenCalledWith("a: 1");
    expect(button("Copied")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(button("Copy")).toBeInTheDocument();
  });

  it("shows Copy failed when clipboard rejects", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    render(<OutputActions format={getFormat("yaml")} state={ok} />);
    await act(async () => fireEvent.click(button("Copy")));
    expect(button("Copy failed")).toBeInTheDocument();
  });

  it("shows Copy failed when clipboard is missing", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    render(<OutputActions format={getFormat("yaml")} state={ok} />);
    await act(async () => fireEvent.click(button("Copy")));
    expect(button("Copy failed")).toBeInTheDocument();
  });

  it("downloads formatted.<ext>", () => {
    render(<OutputActions format={getFormat("yaml")} state={ok} />);
    fireEvent.click(button("Download"));
    expect(downloadText).toHaveBeenCalledWith("formatted.yaml", "a: 1", "application/yaml");
  });

  it("mermaid SVG downloads diagram.svg", () => {
    render(<OutputActions format={getFormat("mermaid")} state={{ status: "ok", output: "<svg/>" }} />);
    fireEvent.click(button("Download SVG"));
    expect(downloadText).toHaveBeenCalledWith("diagram.svg", "<svg/>", "image/svg+xml");
  });

  it("mermaid PNG downloads diagram.png", async () => {
    render(<OutputActions format={getFormat("mermaid")} state={{ status: "ok", output: "<svg/>" }} />);
    await act(async () => fireEvent.click(button("Download PNG")));
    expect(svgToPngBlob).toHaveBeenCalled();
    expect(downloadBlob).toHaveBeenCalledWith("diagram.png", expect.any(Blob));
  });

  it("Cmd/Ctrl+Shift+C copies", async () => {
    render(<OutputActions format={getFormat("json")} state={ok} />);
    await act(async () => fireEvent.keyDown(window, { key: "C", metaKey: true, shiftKey: true }));
    await act(async () => fireEvent.keyDown(window, { key: "c", ctrlKey: true, shiftKey: true }));
    expect(writeText).toHaveBeenCalledTimes(2);
  });

  it("shortcut does nothing for mermaid or when not ok", async () => {
    const { rerender } = render(<OutputActions format={getFormat("mermaid")} state={{ status: "ok", output: "<svg/>" }} />);
    await act(async () => fireEvent.keyDown(window, { key: "C", metaKey: true, shiftKey: true }));
    rerender(<OutputActions format={getFormat("json")} state={{ status: "empty" }} />);
    await act(async () => fireEvent.keyDown(window, { key: "C", metaKey: true, shiftKey: true }));
    expect(writeText).not.toHaveBeenCalled();
  });

  it("plain Shift+C is not the shortcut", async () => {
    render(<OutputActions format={getFormat("json")} state={ok} />);
    await act(async () => fireEvent.keyDown(window, { key: "C", shiftKey: true }));
    expect(writeText).not.toHaveBeenCalled();
  });
});
