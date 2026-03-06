# Connect to VS Code

Add the Seal MCP server to VS Code so GitHub Copilot (or Continue) can manage Seal wallets directly from your editor.

## Setup — GitHub Copilot Agent Mode

Add to your workspace `.vscode/mcp.json`:

```json
{
  "servers": {
    "seal-wallet": {
      "command": "node",
      "args": ["/path/to/seal/packages/mcp-server/dist/index.js"],
      "type": "stdio"
    }
  }
}
```

Or add to your global `settings.json`:

```json
{
  "mcp.servers": {
    "seal-wallet": {
      "command": "node",
      "args": ["/path/to/seal/packages/mcp-server/dist/index.js"]
    }
  }
}
```

Restart VS Code — Seal tools will be available to GitHub Copilot in Agent chat mode.

## Setup — Continue Extension

If you're using [Continue](https://continue.dev), add to `~/.continue/config.json`:

```json
{
  "mcpServers": [
    {
      "name": "seal-wallet",
      "command": "node",
      "args": ["/path/to/seal/packages/mcp-server/dist/index.js"]
    }
  ]
}
```

## Available Tools

| Tool | What it does |
|------|-------------|
| `create_wallet` | Create a new SmartWallet with spending limits |
| `get_wallet` | Fetch wallet on-chain data |
| `register_agent` | Register an agent with scoped permissions |
| `create_session` | Create an ephemeral session key |
| `execute_via_session` | Execute a CPI through Seal |
| `revoke_session` | Emergency revoke a session |
| `derive_wallet_pda` | Derive a wallet PDA address |
| `recover_wallet` | Rotate owner via guardian recovery |

See [MCP Integration](/integrations/mcp) for the full list of 16 tools.

## Example Queries

Use Copilot Agent chat:

```
> Create a Seal wallet with 5 SOL daily limit
> Register an agent called "lp-bot" for Meteora DLMM
> Show me the wallet status and spending today
> Emergency lock wallet 8xQr...F4nK
```

## Zero Hosting Cost

The MCP server runs **locally** on your machine via stdio. No API key, no cloud service, no external network requests (beyond Solana RPC calls).

Source: [github.com/immadominion/seal/tree/main/packages/mcp-server](https://github.com/immadominion/seal)
