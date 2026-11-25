import { describe, expect, it } from "vitest";
import { EditorState, type Extension } from "@codemirror/state";
import { ensureSyntaxTree, foldable } from "@codemirror/language";
import { FORMAT_UI } from "@/components/format-ui";
import { indentFoldRange, indentFolding } from "@/components/indentFolding";
import { formatInput } from "@/formats/formatInput";
import { defaultSettings, FORMATS } from "@/formats/registry";

function stateOf(doc: string, extensions: Extension = []) {
  return EditorState.create({ doc, extensions });
}

/** The text a fold would hide, for readable assertions. */
function folded(state: EditorState, lineNumber: number): string | null {
  const line = state.doc.line(lineNumber);
  const range = foldable(state, line.from, line.to);
  return range ? state.sliceDoc(range.from, range.to) : null;
}

describe("indentation folding", () => {
  const sql = ["SELECT", "  id,", "  name", "FROM", "  users", "WHERE", "  active = 1"].join("\n");

  it("folds each block of indented lines under the line above it", () => {
    const state = stateOf(sql, indentFolding);
    expect(folded(state, 1)).toBe("\n  id,\n  name");
    expect(folded(state, 4)).toBe("\n  users");
    expect(folded(state, 6)).toBe("\n  active = 1");
  });

  it("doesn't fold a line with nothing indented under it", () => {
    const state = stateOf(sql, indentFolding);
    expect(folded(state, 2)).toBeNull();
    expect(folded(state, 7)).toBeNull();
  });

  it("folds nested blocks and keeps blank lines inside a block", () => {
    const mermaid = ["graph TD", "  subgraph One", "    A --> B", "", "    B --> C", "  end", "  C --> D"].join("\n");
    const state = stateOf(mermaid, indentFolding);
    expect(folded(state, 1)).toBe(mermaid.slice("graph TD".length));
    expect(folded(state, 2)).toBe("\n    A --> B\n\n    B --> C");
  });

  it("ends a fold at the last indented line, not at trailing blank lines", () => {
    const state = stateOf("a\n  b\n\n\nc");
    expect(indentFoldRange(state, 0)).toEqual({ from: 1, to: 5 });
  });

  it("counts tabs as indentation", () => {
    const state = stateOf("SELECT\n\ta\nFROM t", indentFolding);
    expect(folded(state, 1)).toBe("\n\ta");
  });

  it("never folds a blank line", () => {
    expect(indentFoldRange(stateOf("\n  a"), 0)).toBeNull();
  });
});

// Every format's editor must be able to fold its own formatted output, so a
// new format without folding fails here instead of shipping without it.
const MULTI_LINE_DIAGRAM = "graph TD\n  A --> B\n  B --> C";

describe.each(FORMATS.map((f) => [f.id, f] as const))("%s editor folding", (id, format) => {
  it("folds the formatted output at its first line", async () => {
    let doc: string;
    if (format.output === "diagram") {
      // Diagram output is a drawing; the input is what the editor shows.
      doc = MULTI_LINE_DIAGRAM;
    } else {
      const outcome = await formatInput(id, format.examples.valid, defaultSettings(id));
      if (outcome.kind !== "ok") throw new Error(`${id} example didn't format`);
      doc = outcome.output;
    }
    const state = stateOf(doc, await FORMAT_UI[id].language());
    ensureSyntaxTree(state, state.doc.length, 5000);
    expect(folded(state, 1), `${id} should fold:\n${doc}`).not.toBeNull();
  });
});
