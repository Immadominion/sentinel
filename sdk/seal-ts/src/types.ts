/**
 * On-chain account types (mirrors Rust state structs).
 */

export interface SmartWallet {
  /** Base58 address of the SmartWallet PDA */
  address: string;
  /** Base58 address of the immutable PDA authority (original owner, used for PDA derivation) */
  pdaAuthority: string;
  /** Base58 address of the owner (has full control, rotatable via recovery) */
  owner: string;
  /** PDA bump seed */
  bump: number;
  /** Replay protection nonce */
  nonce: bigint;
  /** Number of registered agents */
  agentCount: number;
  /** Number of guardians */
  guardianCount: number;
  /** Minimum guardians required for recovery (m-of-n) */
  recoveryThreshold: number;
  /** Guardian public keys (for recovery) */
  guardians: string[];
  /** Maximum lamports that can be spent per day */
  dailyLimitLamports: bigint;
  /** Maximum lamports that can be spent per transaction */
  perTxLimitLamports: bigint;
  /** Lamports spent so far today */
  spentTodayLamports: bigint;
  /** Unix timestamp when the current day started */
  dayStartTimestamp: bigint;
  /** Whether the wallet is locked (no operations allowed) */
  isLocked: boolean;
  /** Whether the wallet is closed */
  isClosed: boolean;
}

export interface AgentConfig {
  /** Base58 address of the AgentConfig PDA */
  configAddress: string;
  /** Base58 address of the parent SmartWallet */
  wallet: string;
  /** Base58 address of the agent's public key */
  agent: string;
  /** Human-readable name of the agent */
  name: string;
  /** PDA bump seed */
  bump: number;
  /** Whether this agent is currently active */
  isActive: boolean;
  /** Programs this agent is allowed to call via CPI */
  allowedPrograms: string[];
  /** Instruction discriminators this agent can invoke (hex strings) */
  allowedInstructions: string[];
  /** Maximum lamports this agent can spend per day */
  dailyLimit: bigint;
  /** Maximum lamports this agent can spend per transaction */
  perTxLimit: bigint;
  /** Default session duration in seconds */
  defaultSessionDuration: bigint;
  /** Maximum session duration in seconds */
  maxSessionDuration: bigint;
  /** Total lamports spent by this agent (lifetime) */
  totalSpent: bigint;
  /** Total transactions executed by this agent */
  txCount: bigint;
  /** Lamports spent by this agent today (rolling daily window) */
  spentToday: bigint;
  /** Unix timestamp of the start of the current daily window */
  dayStartTimestamp: bigint;
}

export interface SessionKey {
  /** Base58 address of the SessionKey PDA */
  sessionAddress: string;
  /** Base58 address of the parent SmartWallet */
  wallet: string;
  /** Base58 address of the agent this session belongs to */
  agent: string;
  /** Base58 address of the ephemeral session public key */
  sessionPubkey: string;
  /** PDA bump seed */
  bump: number;
  /** Unix timestamp when session was created */
  createdAt: bigint;
  /** Unix timestamp when session expires */
  expiresAt: bigint;
  /** Maximum lamports this session can spend */
  maxAmount: bigint;
  /** Lamports spent so far in this session */
  amountSpent: bigint;
  /** Maximum lamports per transaction */
  maxPerTx: bigint;
  /** Whether this session has been revoked */
  isRevoked: boolean;
  /** Replay protection nonce */
  nonce: bigint;
}

/**
 * Check if a session is currently valid (not expired, not revoked, has budget).
 */
export function isSessionValid(session: SessionKey): boolean {
  const now = BigInt(Math.floor(Date.now() / 1000));
  return (
    !session.isRevoked &&
    session.expiresAt > now &&
    session.amountSpent < session.maxAmount
  );
}

/**
 * Get remaining budget for a session.
 */
export function getSessionRemainingBudget(session: SessionKey): bigint {
  return session.maxAmount - session.amountSpent;
}
