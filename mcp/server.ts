import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatInput } from "@/formats/formatInput";
import { FORMATS, sanitizeSettings, type RegisteredFormat } from "@/formats/registry";
import type { FormatId } from "@/formats/types";

/**
 * formatly's formatters as an MCP server, so AI assistants (Claude, ChatGPT,
 * Cursor, …) can format and validate text with the same code as the website.
 *
 * It runs on the user's own machine over stdio: like the website, nothing is
 * sent anywhere. It uses only the UI-free core (src/formats), reaching it
 * through formatInput, the same entry the website's worker uses.
 */

/** Formats an assistant can use: text in, text out, no browser needed (Mermaid needs the DOM to draw). */
export const TOOL_FORMATS: readonly RegisteredFormat[] = FORMATS.filter((f) => f.runsOn === "worker" && f.output === "text");

/** Larger input is refused rather than tying up the server. 5 MB is far beyond any real document pasted to an assistant. */
export const MAX_INPUT_CHARS = 5_000_000;

const FORMAT_IDS = TOOL_FORMATS.map((f) => f.id) as [FormatId, ...FormatId[]];

function describeSettings(format: RegisteredFormat): string {
  if (format.settings.length === 0) return "no settings";
  return format.settings
    .map((s) => `${s.key}: ${s.options.map((o) => `"${o.value}" (${o.label})`).join(", ")}; default "${s.default}"`)
    .join(" | ");
}

const outputSchema = {
  status: z.enum(["ok", "invalid", "failed"]).describe("ok: formatted. invalid: the input has a syntax error. failed: it couldn't be formatted for another reason."),
  output: z.string().optional().describe("The formatted text, when status is ok."),
  message: z.string().optional().describe("What is wrong, when status is invalid or failed."),
  line: z.number().int().optional().describe("1-based line of the syntax error, when status is invalid."),
  column: z.number().int().optional().describe("1-based column of the syntax error, when known."),
  settings: z.record(z.string(), z.string()).describe("The settings actually used, after unknown keys and values were replaced by defaults."),
};

export function createServer(): McpServer {
  const server = new McpServer({ name: "formatly", version: "0.1.0" });

  server.registerTool(
    "format",
    {
      title: "Format and validate code or data",
      description: [
        "Pretty-prints and validates text in one of these formats. If the text is invalid, returns the error with its line and column instead of output.",
        "Formatting only changes layout: values, key order and content are kept (JSON numbers keep their exact digits).",
        ...TOOL_FORMATS.map((f) => `- ${f.id} (${f.label}): ${describeSettings(f)}`),
      ].join("\n"),
      inputSchema: {
        format: z.enum(FORMAT_IDS).describe("Which format the input is in."),
        input: z.string().min(1).max(MAX_INPUT_CHARS).describe("The text to format."),
        settings: z
          .record(z.string(), z.string())
          .optional()
          .describe('Optional, e.g. {"indent": "4"} or {"dialect": "postgresql"} for SQL. See the list above for each format\'s options.'),
      },
      outputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ format, input, settings }) => {
      const used = sanitizeSettings(format, settings ?? {});
      const outcome = await formatInput(format, input, used);
      const label = TOOL_FORMATS.find((f) => f.id === format)?.label ?? format;

      switch (outcome.kind) {
        case "ok":
          return {
            content: [{ type: "text", text: outcome.output }],
            structuredContent: { status: "ok", output: outcome.output, settings: used },
          };
        case "invalid": {
          const { message, line, column } = outcome.error;
          const where = column === undefined ? `line ${line}` : `line ${line}, column ${column}`;
          return {
            isError: true,
            content: [{ type: "text", text: `Invalid ${label} at ${where}: ${message}` }],
            structuredContent: { status: "invalid", message, line, ...(column === undefined ? {} : { column }), settings: used },
          };
        }
        case "failed":
          return {
            isError: true,
            content: [{ type: "text", text: `Couldn't format this ${label}: ${outcome.message}` }],
            structuredContent: { status: "failed", message: outcome.message, settings: used },
          };
        case "cancelled":
          // Only the browser's worker cancels jobs; formatInput never does. Kept so the switch is exhaustive.
          return { isError: true, content: [{ type: "text", text: "Formatting was cancelled." }], structuredContent: { status: "failed", message: "Cancelled", settings: used } };
      }
    },
  );

  server.registerTool(
    "list_formats",
    {
      title: "List supported formats",
      description: "Lists the formats the format tool accepts, with each one's settings, options and defaults.",
      inputSchema: {},
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      const formats = TOOL_FORMATS.map((f) => ({
        id: f.id,
        label: f.label,
        extension: f.extension,
        settings: f.settings.map((s) => ({ key: s.key, label: s.label, default: s.default, options: s.options.map((o) => o.value) })),
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(formats, null, 2) }],
        structuredContent: { formats },
      };
    },
  );

  return server;
}
