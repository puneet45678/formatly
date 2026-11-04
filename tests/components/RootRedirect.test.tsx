import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import { RootRedirect, pickStartFormat } from "@/components/RootRedirect";

beforeEach(() => replace.mockReset());

describe("pickStartFormat", () => {
  it("uses a stored known format", () => {
    expect(pickStartFormat("yaml")).toBe("yaml");
  });

  it("ignores unknown values", () => {
    expect(pickStartFormat("csv")).toBe("json");
    expect(pickStartFormat(null)).toBe("json");
  });
});

describe("RootRedirect", () => {
  it("redirects / to the stored format", () => {
    localStorage.setItem("formatly:lastFormat", "xml");
    render(<RootRedirect />);
    expect(replace).toHaveBeenCalledWith("/xml");
  });

  it("redirects / to json the first time", () => {
    render(<RootRedirect />);
    expect(replace).toHaveBeenCalledWith("/json");
  });
});
