import type { ComponentType } from "react";
import type { Extension } from "@codemirror/state";
import type { FormatId } from "@/formats/types";
import { indentFolding } from "./indentFolding";

// The browser-only half of each format: things that need React or CodeMirror,
// so they can't live in the format definitions (which also run in a Web Worker).
//
// This is the one UI file allowed to name formats. The Record type makes it a
// compile error to add a format to the definitions without adding it here.
// Everything is loaded on demand, so opening /json downloads no SQL grammar.

export interface FormatUi {
  /** The CodeMirror language for the input and output editors: highlighting and code folding. */
  language: () => Promise<Extension>;
  /** An optional rendered view of the output, offered next to the source (Preview / Source). */
  preview?: () => Promise<ComponentType<{ source: string }>>;
}

export const FORMAT_UI: Record<FormatId, FormatUi> = {
  json: { language: () => import("@codemirror/lang-json").then((m) => m.json()) },
  yaml: { language: () => import("@codemirror/lang-yaml").then((m) => m.yaml()) },
  // CodeMirror has no Mermaid grammar: plain text, folded by indentation.
  mermaid: { language: async () => indentFolding },
  xml: { language: () => import("@codemirror/lang-xml").then((m) => m.xml()) },
  // SQL's grammar folds only whole statements; formatted SQL is one clause per
  // line with an indented body, so fold by indentation as VS Code does.
  sql: { language: () => import("@codemirror/lang-sql").then((m) => [m.sql(), indentFolding]) },
  markdown: {
    language: () => import("@codemirror/lang-markdown").then((m) => m.markdown()),
    preview: () => import("./MarkdownPreview").then((m) => m.MarkdownPreview),
  },
};
