import { foldService } from "@codemirror/language";
import { countColumn, type EditorState } from "@codemirror/state";

// Folding by indentation, as VS Code does for languages it has no folding
// rules for: a line folds when the lines after it are indented further, and
// the fold runs until a line is indented no more than it.
//
// Used where the grammar can't fold usefully: SQL's grammar folds only whole
// statements, while formatted SQL puts each clause's body on indented lines;
// Mermaid has no grammar at all. Languages with real folding rules (JSON,
// XML, YAML, Markdown) keep their own, because a fold service takes priority
// over the grammar's rules.

/** The fold range for the line starting at `lineStart`, or null if nothing below it is indented further. */
export function indentFoldRange(state: EditorState, lineStart: number): { from: number; to: number } | null {
  const line = state.doc.lineAt(lineStart);
  if (line.text.trim() === "") return null;
  const indent = countColumn(line.text, state.tabSize, line.text.length - line.text.trimStart().length);

  let end = -1;
  for (let n = line.number + 1; n <= state.doc.lines; n++) {
    const next = state.doc.line(n);
    const text = next.text;
    if (text.trim() === "") continue; // blank lines don't end a block
    const nextIndent = countColumn(text, state.tabSize, text.length - text.trimStart().length);
    if (nextIndent <= indent) break;
    end = next.to;
  }
  return end === -1 ? null : { from: line.to, to: end };
}

export const indentFolding = foldService.of((state, lineStart) => indentFoldRange(state, lineStart));
