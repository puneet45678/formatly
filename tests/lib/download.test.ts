import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadText } from "@/lib/download";

afterEach(() => vi.restoreAllMocks());

describe("downloadText", () => {
  it("clicks an object-URL anchor with the filename", async () => {
    const created: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      created.push(blob);
      return "blob:test";
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadText("formatted.json", '{"a":1}', "application/json");

    const clicked = click.mock.contexts[0] as HTMLAnchorElement | undefined;
    expect(clicked?.download).toBe("formatted.json");
    expect(clicked?.href).toBe("blob:test");
    expect(created[0].type).toBe("application/json");
    expect(await created[0].text()).toBe('{"a":1}');
    expect(document.querySelector("a[download]")).toBeNull();
  });

  it("revokes the object URL only after the download has started", () => {
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadText("formatted.json", "{}", "application/json");
    // Safari can cancel the download if the URL is revoked in the same tick.
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
    vi.useRealTimers();
  });
});
