/**
 * Health check route.
 */

import { Router, Request, Response } from "express";
import { getConnection, SEAL_PROGRAM_ID } from "../services/solana.js";
import config from "../config.js";

const router = Router();

/**
 * GET /health
 * Basic health check + Solana connection status.
 */
router.get("/", async (_req: Request, res: Response) => {
    try {
        const connection = getConnection();
        const slot = await connection.getSlot();

        res.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            network: config.SOLANA_NETWORK,
            programId: SEAL_PROGRAM_ID.toBase58(),
            slot,
        });
    } catch (err) {
        res.status(503).json({
            status: "error",
            timestamp: new Date().toISOString(),
            error: err instanceof Error ? err.message : "Unknown error",
        });
    }
});

export default router;
