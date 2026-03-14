#!/usr/bin/env node

/**
 * Seal MCP Server
 *
 * Model Context Protocol server that exposes Seal smart wallet operations
 * as tools for AI agents in VS Code, Cursor, Claude Desktop, etc.
 *
 * Usage:
 *   npx seal-wallet-mcp-server            # stdio transport (default)
 *   npx seal-wallet-mcp-server --sse     # SSE transport on port 3100
 *
 * Configuration (VS Code / Cursor):
 *   Add to your MCP settings:
 *   {
 *     "seal-wallet": {
 *       "command": "npx",
 *       "args": ["seal-wallet-mcp-server"],
 *       "env": {}
 *     }
 *   }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TOOL_DEFINITIONS, type ToolName } from "./tools.js";
import { handleTool } from "./handlers.js";

// ══════════════════════════════════════════════════════════════
// Server Setup
// ══════════════════════════════════════════════════════════════

const server = new McpServer({
    name: "seal-wallet",
    version: "0.1.0",
});

// ══════════════════════════════════════════════════════════════
// Register Tools
// ══════════════════════════════════════════════════════════════

for (const [name, def] of Object.entries(TOOL_DEFINITIONS)) {
    server.tool(
        name,
        def.description,
        def.inputSchema.shape,
        async (args: Record<string, unknown>) => {
            return handleTool(name, args);
        }
    );
}

// ══════════════════════════════════════════════════════════════
// Resources (read-only context for AI agents)
// ══════════════════════════════════════════════════════════════

server.resource(
    "seal-program-info",
    "seal://program-info",
    async () => ({
        contents: [
            {
                uri: "seal://program-info",
                mimeType: "application/json",
                text: JSON.stringify(
                    {
                        programId: "EV3TKRVz7pTHpAqBTjP8jmwuvoRBRCpjmVSPHhcMnXqb",
                        network: "devnet",
                        description:
                            "Seal is a Pinocchio-based smart wallet on Solana with agent-scoped permissions, ephemeral session keys, and on-chain spending limits.",
                        docs: "https://seal.scrolls.fun",
                        features: [
                            "Smart wallet with PDA-based ownership",
                            "Agent registration with per-agent spending limits",
                            "Ephemeral session keys with time + budget constraints",
                            "CPI execution through session keys",
                            "Guardian-based social recovery",
                            "Default-closed allowlists for programs",
                        ],
                        sdkPackage: "seal-wallet-sdk",
                    },
                    null,
                    2
                ),
            },
        ],
    })
);

server.resource(
    "seal-architecture",
    "seal://architecture",
    async () => ({
        contents: [
            {
                uri: "seal://architecture",
                mimeType: "text/markdown",
                text: `# Seal Smart Wallet Architecture

## Account Hierarchy
\`\`\`
Owner (EOA)
  └── SmartWallet PDA (seeds: ["seal", owner])
        ├── AgentConfig PDA (seeds: ["seal_agent", wallet, agent_pubkey])
        │     └── SessionKey PDA (seeds: ["seal_session", wallet, agent, session_pubkey])
        └── Guardian list (stored in wallet account)
\`\`\`

## Spending Limit Enforcement
1. **Wallet-level**: Global daily limit across all agents
2. **Agent-level**: Per-agent daily + per-tx limits
3. **Session-level**: Per-session budget + per-tx limit
4. All three layers must pass for a transaction to execute.

## Session Key Flow
1. Owner creates wallet → registers agent with allowed programs
2. Agent creates ephemeral session key (time-limited, budget-capped)
3. Agent uses session key to execute CPI through Seal
4. Seal validates limits, checks allowlist, then CPIs to target program
5. Session auto-expires or can be revoked by owner/agent

## Sigil Pairing Token Flow (Recommended)
1. Owner uses Sigil app to create wallet and register agent
2. Owner generates a pairing token (sgil_xxx) in the Sigil app
3. Agent uses \`sigil_request_session\` with the pairing token — no raw keys needed
4. Sigil backend creates session on-chain and returns credentials
5. Agent uses session credentials with \`execute_via_session\` as before
6. Agent sends heartbeats via \`sigil_heartbeat\` for monitoring

## Key Discriminators (8 bytes each)
- SmartWallet: \`SealWalt\`
- AgentConfig: \`SealAgnt\`
- SessionKey: \`SealSess\`
`,
            },
        ],
    })
);

// ══════════════════════════════════════════════════════════════
// Prompts (reusable prompt templates for AI agents)
// ══════════════════════════════════════════════════════════════

server.prompt(
    "setup-autonomous-agent",
    "Step-by-step guide to set up an autonomous trading agent with Seal",
    () => ({
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Help me set up an autonomous trading agent using Seal smart wallet. There are two approaches:

**Option A: Via Sigil (Recommended — no raw keys needed)**
1. Install the Sigil app and connect your Solana wallet
2. Create a Seal smart wallet from the Sigil dashboard
3. Register an agent with spending limits and allowed programs
4. Generate a pairing token (sgil_xxx) in the Sigil app
5. Use \`sigil_request_session\` with the pairing token to get a session
6. Use \`execute_via_session\` with the session credentials to trade
7. Send heartbeats with \`sigil_heartbeat\` so the owner can monitor

**Option B: Direct (requires raw keypairs)**
1. Create a Seal smart wallet with \`create_wallet\`
2. Register the agent with \`register_agent\`
3. Create a session with \`create_session\`
4. Execute transactions with \`execute_via_session\`

Allowed programs example: Meteora DLMM: LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo

Use the Seal MCP tools to perform each step.`,
                },
            },
        ],
    })
);

// ══════════════════════════════════════════════════════════════
// Start Server
// ══════════════════════════════════════════════════════════════

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Seal MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
