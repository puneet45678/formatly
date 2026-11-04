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
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
    expect(document.querySelector("a[download]")).toBeNull();
  });
});
