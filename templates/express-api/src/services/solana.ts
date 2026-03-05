/**
 * Solana connection service.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import config from "../config.js";

// Singleton connection
let connection: Connection | null = null;

export function getConnection(): Connection {
    if (!connection) {
        connection = new Connection(config.SOLANA_RPC_URL, "confirmed");
        console.log(`📡 Connected to Solana ${config.SOLANA_NETWORK}: ${config.SOLANA_RPC_URL}`);
    }
    return connection;
}

export const SENTINEL_PROGRAM_ID = new PublicKey(config.SENTINEL_PROGRAM_ID);

/**
 * Derive SmartWallet PDA from owner pubkey.
 */
export function deriveWalletPda(owner: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("sentinel"), owner.toBuffer()],
        SENTINEL_PROGRAM_ID
    );
}

/**
 * Derive AgentConfig PDA.
 */
export function deriveAgentPda(
    wallet: PublicKey,
    agent: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("agent"), wallet.toBuffer(), agent.toBuffer()],
        SENTINEL_PROGRAM_ID
    );
}

/**
 * Derive SessionKey PDA.
 */
export function deriveSessionPda(
    agent: PublicKey,
    sessionId: number
): [PublicKey, number] {
    const sessionIdBuf = Buffer.alloc(4);
    sessionIdBuf.writeUInt32LE(sessionId);
    return PublicKey.findProgramAddressSync(
        [Buffer.from("session"), agent.toBuffer(), sessionIdBuf],
        SENTINEL_PROGRAM_ID
    );
}
