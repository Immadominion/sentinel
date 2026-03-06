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
                    text: `Help me set up an autonomous trading agent using Seal smart wallet. Here's the process:

1. First, create a Seal smart wallet with appropriate daily and per-tx spending limits
2. Generate or provide an agent keypair
3. Register the agent on the wallet with:
   - A descriptive name
   - Agent-specific spending limits (should be <= wallet limits)
   - Allowed programs (e.g., Meteora DLMM: LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo)
4. Create a session key for the agent with time and budget constraints
5. The agent can now execute transactions via the session key

Use the Seal MCP tools to perform each step. Ask me for the required keypairs and configuration values.`,
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
