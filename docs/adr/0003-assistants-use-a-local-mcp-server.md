# ADR 0003: AI assistants use formatly through a local MCP server

- Status: accepted
- Date: 2026-11-05

## Context

We want AI assistants (Claude, ChatGPT, Cursor and others) to be able to use formatly's formatters as a tool, not just recommend the website. Options:

1. **A hosted HTTP API** that assistants or developers call.
2. **A hosted (remote) MCP server.**
3. **A local MCP server** the user installs, which the assistant starts on their machine and talks to over stdio.

## Decision

Ship option 3: `formatly-mcp`, an MCP server in `mcp/`, bundled into one file with no runtime dependencies and published to npm.

## Why

- **It keeps the privacy promise.** The website's point is that pasted data never leaves the browser. A hosted API or remote server would receive everyone's data. A local server keeps it on the user's machine.
- **No backend.** The site is a static export with no server; options 1 and 2 would add hosting, cost, rate limiting, abuse handling and uptime to a project with none of those today.
- **MCP is the standard tool interface** for current assistants. One server works in Claude Desktop, Claude Code, Cursor and other clients without per-vendor work.
- **The architecture already allowed it.** The core (`src/formats`) runs in plain Node with no React or DOM, a rule enforced by lint and tests since Phase A. The server is a thin layer over `formatInput`, the same entry point the website's worker uses, so assistants get exactly the website's behaviour.

## Consequences

- Mermaid is not offered: drawing needs a browser DOM. The tool list is derived from the definitions (`runsOn: "worker"`, text output), so it stays right as formats are added.
- Users have to install it (one config line with `npx`). A hosted remote MCP server could be added later for convenience; the core would run unchanged in a serverless function, but it would need its own privacy policy, since data would then leave the user's machine.
- Publishing needs an npm account and a license for the package.
- CI builds the bundle and checks it over stdio; the bundle prefers packages' ESM builds, because jsonc-parser's UMD build loads its parts with runtime `require` calls a bundler can't follow (found by that smoke test).
