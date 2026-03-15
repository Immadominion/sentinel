import { Keypair, PublicKey } from "@solana/web3.js";

export interface SigilAgentConfig {
  /** The pairing token obtained from the Sigil app (format: sgil_xxx) */
  pairingToken: string;
  /** Sigil backend URL (default: http://localhost:3003) */
  apiUrl?: string;
  /** Solana RPC URL for on-chain operations (default: mainnet-beta) */
  rpcUrl?: string;
  /** Auto-refresh session before expiry (default: true) */
  autoRefresh?: boolean;
  /** Minimum remaining session time before refresh, in seconds (default: 300 = 5min) */
  refreshThresholdSecs?: number;
}

export interface SessionCredentials {
  sessionPubkey: string;
  sessionSecretKey: string; // base64-encoded
  sessionPda: string;
  walletPda: string;
  agentConfigPda: string;
  agentPubkey: string;
  expiresAt: string;
  maxAmountLamports: string;
  maxPerTxLamports: string;
  txSignature: string;
}

export interface SessionRequestOptions {
  durationSecs?: number;
  maxAmountSol?: number;
  maxPerTxSol?: number;
}
