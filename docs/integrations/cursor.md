# Connect to Cursor

Add Seal's MCP server to Cursor so your AI assistant can manage Seal wallets, register agents, and execute transactions inline.

## Setup

Edit your Cursor MCP config (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "seal-wallet": {
      "command": "node",
      "args": ["/path/to/seal/packages/mcp-server/dist/index.js"]
    }
  }
}
```

Restart Cursor — the Seal tools will appear in your AI chat.

## Available Tools

Once connected, your Cursor AI can use all 16 Seal tools:

| Tool | Description |
|------|-------------|
| `create_wallet` | Create a new SmartWallet |
| `get_wallet` | Fetch wallet on-chain data |
| `register_agent` | Register an agent with scoped permissions |
| `create_session` | Create an ephemeral session key |
| `execute_via_session` | Execute a CPI through Seal |
| `revoke_session` | Emergency revoke a session |

See [MCP Integration](/integrations/mcp) for the full list.

## Example Usage

Ask Cursor Agent:

```
> "Create a Seal wallet with 5 SOL daily limit"
> "Register my LP bot agent with Meteora-only access"
> "Show me all active sessions for my wallet"
> "What's the remaining budget on my current session?"
```

The MCP server runs locally — **no API key, no cost, no network dependency** (beyond Solana RPC).

Source: [github.com/immadominion/seal](https://github.com/immadominion/seal)
