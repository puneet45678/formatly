import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server";

// Entry point for `npx formatly-mcp`: serves the tools over stdin/stdout.
// Logs go to stderr, because stdout carries the protocol.
createServer()
  .connect(new StdioServerTransport())
  .catch((error: unknown) => {
    console.error("formatly-mcp failed to start:", error);
    process.exit(1);
  });
