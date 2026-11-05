# formatly-mcp

formatly's formatters for AI assistants. Gives Claude, ChatGPT, Cursor and any other [MCP](https://modelcontextprotocol.io) client a tool to format and validate **JSON, YAML, XML, SQL and Markdown**, with the same code as the formatly website.

It runs on your machine. Nothing you or your assistant formats is sent anywhere.

## Tools

| Tool | What it does |
| --- | --- |
| `format` | Formats `input` in the given `format` (`json`, `yaml`, `xml`, `sql`, `markdown`). Invalid input comes back as an error with its line and column. Optional `settings`, e.g. `{"indent": "4"}`, `{"indent": "tab"}`, `{"dialect": "postgresql"}`. |
| `list_formats` | Lists the formats and each one's settings, options and defaults. |

Both are read-only. Formatting changes layout only: values, key order and content are kept, and JSON numbers keep their exact digits.

Mermaid isn't offered: drawing a diagram needs a browser.

## Use it

Once published to npm, add it to your assistant's MCP configuration.

**Claude Code**

```sh
claude mcp add formatly -- npx -y formatly-mcp
```

**Claude Desktop, Cursor and most other clients** (`claude_desktop_config.json`, `.cursor/mcp.json`, …):

```json
{
  "mcpServers": {
    "formatly": { "command": "npx", "args": ["-y", "formatly-mcp"] }
  }
}
```

**From a clone, before publishing:** run `npm run build:mcp` in the repository, then use `"command": "node", "args": ["/path/to/formatly/mcp/dist/formatly-mcp.cjs"]`.

## Develop

- Source: `mcp/server.ts` (the tools) and `mcp/main.ts` (stdio entry). It uses only the UI-free core in `src/formats`.
- `npm run build:mcp` bundles everything, libraries included, into `mcp/dist/formatly-mcp.cjs` (about 1.7 MB, no runtime dependencies).
- `npm test` runs `tests/mcp/server.test.ts` through a real MCP client; `npm run test:mcp` starts the bundle over stdio and checks every format. CI runs both.

## Publish

From `mcp/`, after `npm run build:mcp` at the repository root: `npm publish`. The package needs a license chosen first (add a `LICENSE` file and a `license` field).
