# Connect to VS Code

Add the Seal Docs MCP server to VS Code (with GitHub Copilot or Continue) so your AI can reference Seal's full documentation inline.

<McpInstallButtons 
  title="Install Seal MCP for VS Code"
  description="Enable GitHub Copilot and other AI assistants to access Seal documentation directly."
  server-name="seal-docs"
  package-name="@seal-wallet/mcp-docs"
/>

## Option A — GitHub Copilot Agent Mode

Add to your VS Code workspace settings (`.vscode/mcp.json`):

```json
{
  "servers": {
    "seal-docs": {
      "command": "npx",
      "args": ["-y", "@seal-wallet/mcp-docs"],
      "type": "stdio"
    }
  }
}
```

Or add to your global `settings.json`:

```json
{
  "mcp.servers": {
    "seal-docs": {
      "command": "npx",
      "args": ["-y", "@seal-wallet/mcp-docs"]
    }
  }
}
```

Restart VS Code — Seal docs will be available to GitHub Copilot Agent in chat mode.

## Option B — Continue Extension

If you're using [Continue](https://continue.dev), add to your `~/.continue/config.json`:

```json
{
  "mcpServers": [
    {
      "name": "seal-docs",
      "command": "npx",
      "args": ["-y", "@seal-wallet/mcp-docs"]
    }
  ]
}
```

## Available Tools

| Tool | What it does |
|------|-------------|
| `search_seal_docs` | Find relevant documentation for your query |
| `get_seal_page` | Get full page content (e.g., "api/typescript-sdk") |
| `list_seal_pages` | List all pages available |

## Example Queries

Use `@seal-docs` in Copilot Chat:

```
@seal-docs How do I register an agent with custom spending limits?
@seal-docs What's the SmartWallet account structure?
@seal-docs Show me how to implement emergency lock in TypeScript
@seal-docs What are all available Seal instructions?
```

## Zero Cost, Zero Hosting

The MCP server is an **npm package that runs locally** via `npx`. No API key required. No network request to our servers. Your docs requests stay on your machine.

Source: [github.com/immadominion/seal/tree/main/sdk/seal-mcp-docs](https://github.com/immadominion/seal)
