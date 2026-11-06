import { describe, expect, it } from "vitest";
import { FORMATS } from "@/formats/registry";
import { formatJson } from "@/formats/formatters/json";
import { ABOUT, FORMAT_LIST, INTRO } from "@/content/site";

describe("site text", () => {
  it("names every format, read from the registry", () => {
    for (const { label } of FORMATS) {
      expect(FORMAT_LIST).toContain(label);
      expect(ABOUT.lead).toContain(label);
      expect(INTRO.lead).toContain(label);
    }
  });

  it("has an answer for every question and no empty text", () => {
    expect(ABOUT.features.length).toBeGreaterThanOrEqual(4);
    expect(ABOUT.questions.length).toBeGreaterThanOrEqual(3);
    for (const { question, answer } of ABOUT.questions) {
      expect(question.trim().endsWith("?")).toBe(true);
      expect(answer.trim().length).toBeGreaterThan(20);
    }
    for (const { lead, text } of ABOUT.features) expect(`${lead}${text}`.trim().length).toBeGreaterThan(10);
  });

  it("only makes promises the product keeps", () => {
    const all = JSON.stringify([INTRO, ABOUT]).toLowerCase();
    // Claims we do not make (they are not true today). If one becomes true, change this test on purpose.
    for (const claim of ["content security policy", "csp", "offline", "50,000", "500 connections", "no sign-up required to"])
      expect(all).not.toContain(claim);
  });

  it("the demo shows what the JSON formatter really does", () => {
    expect(formatJson(INTRO.demo.before)).toEqual({ ok: true, output: INTRO.demo.after });
  });
});
