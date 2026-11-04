import { describe, expect, test } from "vitest";
import { CONTENT_SECURITY_POLICY } from "@/lib/csp";

function directive(name: string): string[] | undefined {
  const entry = CONTENT_SECURITY_POLICY.split("; ").find((d) => d.split(" ")[0] === name);
  return entry?.split(" ").slice(1);
}

describe("content security policy", () => {
  // These are the promise "nothing you paste leaves the page", written as
  // rules the browser enforces. Loosening one should be a deliberate change.
  test("network requests may only go to this site", () => {
    expect(directive("connect-src")).toEqual(["'self'"]);
  });

  test("defaults to this site only", () => {
    expect(directive("default-src")).toEqual(["'self'"]);
  });

  test("blocks plugins, base-tag hijacking and form posts", () => {
    expect(directive("object-src")).toEqual(["'none'"]);
    expect(directive("base-uri")).toEqual(["'self'"]);
    expect(directive("form-action")).toEqual(["'none'"]);
  });

  test("scripts and workers come only from this site (plus Next's inline bootstrap)", () => {
    expect(directive("script-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(directive("worker-src")).toEqual(["'self'"]);
  });
});
