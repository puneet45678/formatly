// The text shown on every page: the intro above the tool and the About section below it.
// It describes the site, not one format, so adding a format changes none of it
// (the list of formats is read from FORMATS).
//
// Every sentence here must be true of the product. tests/content/site.test.ts and
// tests/architecture.test.ts check the ones that can be checked; keep claims modest.

import { FORMATS } from "@/formats/registry";

const labels = FORMATS.map((f) => f.label);
/** "JSON, YAML and Markdown" */
export const FORMAT_LIST = `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;

export const INTRO = {
  headline: ["Paste anything.", "Get it formatted."],
  lead: `${FORMAT_LIST}, tidied as you type, with errors that point at the exact line.`,
  facts: ["Nothing is uploaded", "Exact line and column", "Handles big pastes"],
  /** The one-line version shown once there is something in the input. */
  compact: ["Paste. Format. Done.", "Runs entirely in your browser, nothing is uploaded."],
  /** A looping before/after: typed on the left, shown tidied below it. */
  demo: {
    before: '{"user":"ada","admin":true,"id":7}',
    after: '{\n  "user": "ada",\n  "admin": true,\n  "id": 7\n}',
  },
} as const;

export interface Question {
  question: string;
  answer: string;
}

export const ABOUT = {
  title: "A private formatter for the formats you paste every day",
  lead: `Paste ${FORMAT_LIST} on the left and get it tidied on the right as you type. Errors name the line and column. It formats and checks; it never converts one format into another.`,
  heading: { features: "What it does", questions: "Questions" },
  features: [
    { lead: "Several formats in one place.", text: "Each has its own page and its own remembered settings." },
    { lead: "Clear errors.", text: "They point at the line and highlight it in the input." },
    { lead: "Copy or download.", text: "Downloads use the right file type for each format." },
    {
      lead: "Smooth on big pastes.",
      text: "Formatting runs in a background worker, so typing stays responsive. Mermaid diagrams are drawn on the page itself.",
    },
    {
      lead: "Extras where they help.",
      text: "Zoom and pan for Mermaid diagrams, a rendered preview for Markdown, and a dialect picker for SQL.",
    },
  ],
  questions: [
    {
      question: "Is my data sent to a server?",
      answer:
        "No. Formatting runs in your browser, on your own device. What you paste is kept in memory only: it is never uploaded or saved.",
    },
    {
      question: "Can it convert JSON to YAML, or other formats?",
      answer: "No, on purpose. Each page formats one format and keeps it that format.",
    },
    {
      question: "What happens with invalid input?",
      answer:
        "You get an error with the line and column instead of a half-formatted result. JSON is checked strictly, so comments and trailing commas are reported.",
    },
    {
      question: "Is anything remembered between visits?",
      answer:
        "Your settings (like the SQL dialect) and how you arranged the panes are remembered in your browser. The text you paste is not.",
    },
  ] satisfies Question[],
} as const;
