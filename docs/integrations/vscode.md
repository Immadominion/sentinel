# Connect to VS Code

Add the Sentinel Docs MCP server to VS Code (with GitHub Copilot or Continue) so your AI can reference Sentinel's full documentation inline.

## Option A — GitHub Copilot Agent Mode

Add to your VS Code workspace settings (`.vscode/mcp.json`):

```json
{
  "servers": {
    "sentinel-docs": {
      "command": "npx",
      "args": ["-y", "@sentinel-wallet/mcp-docs"],
      "type": "stdio"
    }
  }
}
```

Or add to your global `settings.json`:

```json
{
  "mcp.servers": {
    "sentinel-docs": {
      "command": "npx",
      "args": ["-y", "@sentinel-wallet/mcp-docs"]
    }
  }
}
```

Restart VS Code — Sentinel docs will be available to GitHub Copilot Agent in chat mode.

## Option B — Continue Extension

If you're using [Continue](https://continue.dev), add to your `~/.continue/config.json`:

```json
{
  "mcpServers": [
    {
      "name": "sentinel-docs",
      "command": "npx",
      "args": ["-y", "@sentinel-wallet/mcp-docs"]
    }
  ]
}
```

## Available Tools

| Tool | What it does |
|------|-------------|
| `search_sentinel_docs` | Find relevant documentation for your query |
| `get_sentinel_page` | Get full page content (e.g., "api/typescript-sdk") |
| `list_sentinel_pages` | List all pages available |

## Example Queries

Use `@sentinel-docs` in Copilot Chat:

```
@sentinel-docs How do I register an agent with custom spending limits?
@sentinel-docs What's the SmartWallet account structure?
@sentinel-docs Show me how to implement emergency lock in TypeScript
@sentinel-docs What are all available Sentinel instructions?
```

## Zero Cost, Zero Hosting

The MCP server is an **npm package that runs locally** via `npx`. No API key required. No network request to our servers. Your docs requests stay on your machine.

Source: [github.com/immadominion/sentinel/tree/main/sdk/sentinel-mcp-docs](https://github.com/immadominion/sentinel)
