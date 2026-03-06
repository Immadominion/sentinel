/**
 * PDA derivation helpers for Seal accounts.
 */

import { PublicKey } from "@solana/web3.js";
import {
    SEAL_PROGRAM_ID,
    WALLET_SEED,
    AGENT_SEED,
    SESSION_SEED,
} from "./constants";

/**
 * Derive the SmartWallet PDA for an owner.
 * Seeds: ["seal", owner_pubkey]
 */
export function deriveWalletPda(
    owner: PublicKey,
    programId: PublicKey = SEAL_PROGRAM_ID
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [WALLET_SEED, owner.toBuffer()],
        programId
    );
}

/**
 * Derive the AgentConfig PDA for a wallet + agent pair.
 * Seeds: ["agent", wallet_pubkey, agent_pubkey]
 */
export function deriveAgentPda(
    wallet: PublicKey,
    agent: PublicKey,
    programId: PublicKey = SEAL_PROGRAM_ID
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [AGENT_SEED, wallet.toBuffer(), agent.toBuffer()],
        programId
    );
}

/**
 * Derive the SessionKey PDA for a wallet + agent + session pubkey.
 * Seeds: ["session", wallet_pubkey, agent_pubkey, session_pubkey]
 */
export function deriveSessionPda(
    wallet: PublicKey,
    agent: PublicKey,
    sessionPubkey: PublicKey,
    programId: PublicKey = SEAL_PROGRAM_ID
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [SESSION_SEED, wallet.toBuffer(), agent.toBuffer(), sessionPubkey.toBuffer()],
        programId
    );
}
