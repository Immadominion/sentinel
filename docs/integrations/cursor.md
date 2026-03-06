# Connect to Cursor

Add Sentinel's documentation MCP server to Cursor so your AI assistant can look up Sentinel APIs, concepts, and examples inline.

<McpInstallButtons 
  title="Install Sentinel MCP for Cursor"
  description="Give your Cursor AI instant access to Sentinel's documentation — session keys, spending limits, instructions API, and more."
  server-name="sentinel-docs"
  package-name="@sentinel-wallet/mcp-docs"
/>

## Manual Setup

Edit your Cursor MCP config (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "sentinel-docs": {
      "command": "npx",
      "args": ["-y", "@sentinel-wallet/mcp-docs"]
    }
  }
}
```

Restart Cursor — the Sentinel docs tools will appear in your AI chat.

## Available Tools

Once connected, your Cursor AI can use:

| Tool | Description |
|------|-------------|
| `search_sentinel_docs` | Semantic search across all Sentinel docs |
| `get_sentinel_page` | Retrieve full content of any docs page |
| `list_sentinel_pages` | List all available documentation pages |

## Example Usage

Ask Cursor Agent:

```
> "How do I create a session key in Sentinel?"
> "What are the PDA seeds for the SmartWallet account?"
> "Show me how to register an agent with a 0.1 SOL daily limit"
> "What's the difference between daily_limit and per_tx_limit?"
```

The MCP server runs locally — **no API key, no cost, no network dependency**.

## Wallet MCP (Coming Soon)

The Wallet MCP server will let you control Sentinel wallets directly from Cursor:

```
> "Create a new Sentinel wallet on devnet"
> "Register my LP bot agent with Meteora-only access"  
> "Show me all active sessions for wallet 8xQr...F4nK"
> "Emergency lock wallet 8xQr...F4nK"
```

Stay tuned — [watch the repo](https://github.com/immadominion/sentinel) for updates.
