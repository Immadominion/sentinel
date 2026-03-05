/**
 * Sentinel Backend API
 *
 * Express 5 server providing REST endpoints for Sage mobile app
 * to interact with Sentinel smart wallets on Solana.
 */

import express from "express";
import cors from "cors";
import config from "./config.js";
import { errorHandler } from "./middleware/error.js";
import healthRouter from "./routes/health.js";
import walletRouter from "./routes/wallet.js";
import agentRouter from "./routes/agent.js";
import sessionRouter from "./routes/session.js";

const app = express();

// ════════════════════════════════════════════════════════════════
// Middleware
// ════════════════════════════════════════════════════════════════

// CORS
const corsOrigins = config.CORS_ORIGINS === "*" ? "*" : config.CORS_ORIGINS.split(",");
app.use(cors({ origin: corsOrigins }));

// JSON body parser
app.use(express.json());

// Request logging (simple)
app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// ════════════════════════════════════════════════════════════════
// Routes
// ════════════════════════════════════════════════════════════════

app.use("/health", healthRouter);
app.use("/wallet", walletRouter);
app.use("/agent", agentRouter);
app.use("/session", sessionRouter);

// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
});

// Error handler (must be last)
app.use(errorHandler);

// ════════════════════════════════════════════════════════════════
// Start Server
// ════════════════════════════════════════════════════════════════

const PORT = config.PORT;

app.listen(PORT, () => {
    console.log();
    console.log("═".repeat(60));
    console.log("  Sentinel Backend API");
    console.log("═".repeat(60));
    console.log(`  Port:      ${PORT}`);
    console.log(`  Network:   ${config.SOLANA_NETWORK}`);
    console.log(`  RPC:       ${config.SOLANA_RPC_URL}`);
    console.log(`  Program:   ${config.SENTINEL_PROGRAM_ID}`);
    console.log("═".repeat(60));
    console.log();
    console.log("Endpoints:");
    console.log("  GET  /health");
    console.log("  POST /wallet/prepare-create");
    console.log("  GET  /wallet/:address");
    console.log("  GET  /wallet/by-owner/:owner");
    console.log("  GET  /wallet/:address/balance");
    console.log("  POST /agent/prepare-register");
    console.log("  GET  /agent/:configAddress");
    console.log("  GET  /agent/by-wallet/:walletAddress/:agentPubkey");
    console.log("  POST /session/prepare-create");
    console.log("  POST /session/prepare-revoke");
    console.log("  GET  /session/:sessionAddress");
    console.log("  GET  /session/by-agent/:agentPubkey/:sessionId");
    console.log();
});

export default app;
