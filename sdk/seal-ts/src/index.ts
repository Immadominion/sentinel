/**
 * Seal Smart Wallet SDK
 *
 * A TypeScript SDK for interacting with the Seal smart wallet program on Solana.
 * Provides autonomous agent capabilities with on-chain spending limits and scoped permissions.
 *
 * @packageDocumentation
 */

// Core client
export { SealClient, type SealClientConfig } from "./client";

// Types
export {
  type SmartWallet,
  type AgentConfig,
  type SessionKey,
  isSessionValid,
  getSessionRemainingBudget,
} from "./types";

// Constants
export {
  SEAL_PROGRAM_ID,
  WALLET_SEED,
  AGENT_SEED,
  SESSION_SEED,
  SMART_WALLET_DISCRIMINATOR,
  AGENT_CONFIG_DISCRIMINATOR,
  SESSION_KEY_DISCRIMINATOR,
  InstructionDiscriminant,
  MAX_GUARDIANS,
  MAX_ALLOWED_PROGRAMS,
  MAX_ALLOWED_INSTRUCTIONS,
  DEFAULT_SESSION_DURATION_SECS,
  MAX_SESSION_DURATION_SECS,
  SMART_WALLET_SIZE,
  AGENT_CONFIG_SIZE,
  SESSION_KEY_SIZE,
} from "./constants";

// PDA helpers
export { deriveWalletPda, deriveAgentPda, deriveSessionPda } from "./pda";

// Instruction builders (for advanced usage)
export {
  createWalletInstruction,
  registerAgentInstruction,
  createSessionInstruction,
  revokeSessionInstruction,
  executeViaSessionInstruction,
  updateSpendingLimitInstruction,
  addGuardianInstruction,
  deregisterAgentInstruction,
  recoverWalletInstruction,
  closeWalletInstruction,
  lockWalletInstruction,
  removeGuardianInstruction,
  setRecoveryThresholdInstruction,
  solToLamports,
  type CreateWalletParams,
  type RegisterAgentParams,
  type CreateSessionParams,
  type RevokeSessionParams,
  type ExecuteViaSessionParams,
  type UpdateSpendingLimitParams,
  type AddGuardianParams,
  type DeregisterAgentParams,
  type RecoverWalletParams,
  type CloseWalletParams,
  type LockWalletParams,
  type RemoveGuardianParams,
  type SetRecoveryThresholdParams,
} from "./instructions";

// Account deserialization (for advanced usage)
export {
  deserializeSmartWallet,
  deserializeAgentConfig,
  deserializeSessionKey,
} from "./accounts";
