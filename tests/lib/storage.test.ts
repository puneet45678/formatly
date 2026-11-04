import { afterEach, describe, expect, it, vi } from "vitest";
import { readStored, writeStored, STORAGE_KEYS } from "@/lib/storage";

afterEach(() => vi.restoreAllMocks());

describe("storage", () => {
  it("round-trips a value", () => {
    writeStored("formatly:test", "hello");
    expect(readStored("formatly:test")).toBe("hello");
  });

  it("returns null for a missing key", () => {
    expect(readStored("formatly:missing")).toBeNull();
  });

  it("survives storage that throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(readStored("x")).toBeNull();
    expect(() => writeStored("x", "y")).not.toThrow();
  });

  it("uses the spec keys", () => {
    expect(STORAGE_KEYS).toEqual({
      lastFormat: "formatly:lastFormat",
      sqlDialect: "formatly:sqlDialect",
      railCollapsed: "formatly:railCollapsed",
    });
  });
});
