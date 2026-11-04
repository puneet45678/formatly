import { formatError } from "../errors";
import type { FormatResult } from "../types";

// Prettier is large, so it is imported inside the function: the browser only
// downloads it the first time someone formats Markdown.
// The settings argument is ignored, so this fits the Formatter type with one parameter.
export async function formatMarkdown(input: string): Promise<FormatResult> {
  try {
    const { format } = await import("prettier/standalone");
    const markdownPlugin = await import("prettier/plugins/markdown");
    return { ok: true, output: await format(input, { parser: "markdown", plugins: [markdownPlugin] }) };
  } catch (e) {
    // Prettier errors carry the position in `loc`; Markdown rarely fails, so fall back to line 1.
    const error = e as { message?: string; loc?: { start?: { line?: number; column?: number } } };
    const firstLine = (error.message ?? String(e)).split("\n")[0];
    return formatError(firstLine, error.loc?.start?.line ?? 1, error.loc?.start?.column);
  }
}
