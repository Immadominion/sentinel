# @seal-wallet/mcp-server

Model Context Protocol (MCP) server for the **Seal smart wallet** on Solana. Exposes on-chain wallet operations as AI-agent tools — usable in VS Code (Copilot), Cursor, Claude Desktop, and any MCP-compatible client.

## Quick Start

```bash
# Install and run
npx @seal-wallet/mcp-server
```

### VS Code / Cursor Configuration

Add to your MCP settings (`.vscode/mcp.json` or user settings):

```json
{
  "servers": {
    "seal-wallet": {
      "command": "npx",
      "args": ["@seal-wallet/mcp-server"]
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "seal-wallet": {
      "command": "npx",
      "args": ["@seal-wallet/mcp-server"]
    }
  }
}
```

## Available Tools

### Wallet Operations

| Tool | Description |
|------|-------------|
| `create_wallet` | Create a new Seal smart wallet with spending limits |
| `get_wallet` | Fetch wallet on-chain data (limits, guardians, status) |
| `update_spending_limits` | Update daily and per-tx spending limits |
| `add_guardian` | Add a guardian for social recovery |
| `close_wallet` | Permanently close wallet and return rent |

### Agent Operations

| Tool | Description |
|------|-------------|
| `register_agent` | Register an AI agent with scoped permissions |
| `get_agent_config` | Fetch agent configuration and limits |
| `deregister_agent` | Remove an agent from the wallet |

### Session Operations

| Tool | Description |
|------|-------------|
| `create_session` | Create a time-limited, budget-capped session key |
| `get_session` | Check session status, expiry, and remaining budget |
| `revoke_session` | Revoke an active session |

### Execute Operations

| Tool | Description |
|------|-------------|
| `execute_via_session` | Execute a CPI through a session key (core autonomous operation) |

### PDA Derivation (offline)

| Tool | Description |
|------|-------------|
| `derive_wallet_pda` | Derive wallet PDA from owner key |
| `derive_agent_pda` | Derive agent config PDA |
| `derive_session_pda` | Derive session PDA |

### Recovery

| Tool | Description |
|------|-------------|
| `recover_wallet` | Guardian-initiated owner rotation |

## Resources

The server also exposes read-only resources:

- **`seal://program-info`** — Program ID, network, SDK info
- **`seal://architecture`** — Account hierarchy, spending limit model, session flow

## Prompts

- **`setup-autonomous-agent`** — Step-by-step guide for setting up an autonomous trading agent

## Security

- **Secret keys** are passed per-call and never stored by the server
- **Session keys** are ephemeral — use `create_session` to generate one, then `execute_via_session` with it
- **Spending limits** are enforced on-chain at three layers: wallet, agent, and session
- **Allowed programs** follow a default-closed model — agents can only CPI into explicitly allowed programs

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
node dist/index.js
```

## License

Apache-2.0
