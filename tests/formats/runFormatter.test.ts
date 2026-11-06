import { afterEach, describe, expect, it, vi } from "vitest";
import type { FormatResult } from "@/formats/types";

// The two paths runFormatter chooses between, replaced with spies. vi.hoisted
// runs before the (hoisted) vi.mock calls below, so the mocks can use them.
const mocks = vi.hoisted(() => ({
  workerRun: vi.fn(),
  formatInput: vi.fn(),
}));

vi.mock("@/formats/workerClient", () => ({
  createWorkerClient: () => ({ run: mocks.workerRun, dispose: () => {} }),
}));
vi.mock("@/formats/formatInput", () => ({ formatInput: mocks.formatInput }));

import { runFormatter } from "@/formats/runFormatter";

const fromWorker: FormatResult = { ok: true, output: "from worker" };
const fromPage: FormatResult = { ok: true, output: "from page" };

afterEach(() => {
  vi.unstubAllGlobals();
  mocks.workerRun.mockReset();
  mocks.formatInput.mockReset();
});

describe("runFormatter", () => {
  it("runs worker formats in the worker when available", async () => {
    vi.stubGlobal("Worker", class {});
    mocks.workerRun.mockResolvedValue(fromWorker);

    await expect(runFormatter("json", "{}", { indent: "2" })).resolves.toBe(fromWorker);

    expect(mocks.workerRun).toHaveBeenCalledWith("json", "{}", { indent: "2" });
    expect(mocks.formatInput).not.toHaveBeenCalled();
  });

  it("falls back to the page when Worker is missing", async () => {
    // jsdom has no Worker, so this is the default; make it explicit anyway.
    vi.stubGlobal("Worker", undefined);
    mocks.formatInput.mockResolvedValue(fromPage);

    await expect(runFormatter("json", "{}", {})).resolves.toBe(fromPage);

    expect(mocks.formatInput).toHaveBeenCalledWith("json", "{}", {});
    expect(mocks.workerRun).not.toHaveBeenCalled();
  });

  it("runs main-thread formats on the page", async () => {
    vi.stubGlobal("Worker", class {});
    mocks.formatInput.mockResolvedValue(fromPage);

    await expect(runFormatter("mermaid", "graph TD; A-->B", {})).resolves.toBe(fromPage);

    expect(mocks.formatInput).toHaveBeenCalledWith("mermaid", "graph TD; A-->B", {});
    expect(mocks.workerRun).not.toHaveBeenCalled();
  });
});
