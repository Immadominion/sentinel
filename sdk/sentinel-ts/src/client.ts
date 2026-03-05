/**
 * High-level client for the Sentinel smart wallet.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { SENTINEL_PROGRAM_ID } from "./constants";
import { deriveWalletPda, deriveAgentPda, deriveSessionPda } from "./pda";
import {
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
  solToLamports,
  CreateWalletParams,
  RegisterAgentParams,
  CreateSessionParams,
  RevokeSessionParams,
  ExecuteViaSessionParams,
  UpdateSpendingLimitParams,
  AddGuardianParams,
  DeregisterAgentParams,
  RecoverWalletParams,
  CloseWalletParams,
} from "./instructions";
import {
  deserializeSmartWallet,
  deserializeAgentConfig,
  deserializeSessionKey,
} from "./accounts";
import { SmartWallet, AgentConfig, SessionKey } from "./types";

export interface SentinelClientConfig {
  /** RPC endpoint URL */
  rpcUrl?: string;
  /** Network (defaults to devnet) */
  network?: "mainnet" | "devnet" | "localnet";
  /** The Sentinel program ID */
  programId?: PublicKey;
  /** Commitment level */
  commitment?: "processed" | "confirmed" | "finalized";
}

const DEFAULT_RPC: Record<string, string> = {
  mainnet: "https://api.mainnet-beta.solana.com",
  devnet: "https://api.devnet.solana.com",
  localnet: "http://localhost:8899",
};

/**
 * High-level client for interacting with the Sentinel smart wallet program.
 *
 * @example
 * ```typescript
 * const client = new SentinelClient({ network: "devnet" });
 *
 * // Create a wallet
 * const wallet = await client.createWallet(ownerKeypair, {
 *   dailyLimitSol: 10,
 *   perTxLimitSol: 1,
 * });
 *
 * // Register an agent
 * const agent = await client.registerAgent(ownerKeypair, agentPubkey, {
 *   name: "Sage LP Bot",
 *   dailyLimitSol: 2,
 *   perTxLimitSol: 0.5,
 * });
 * ```
 */
export class SentinelClient {
  readonly connection: Connection;
  readonly programId: PublicKey;

  constructor(config: SentinelClientConfig = {}) {
    const network = config.network ?? "devnet";
    const rpcUrl = config.rpcUrl ?? DEFAULT_RPC[network];
    this.connection = new Connection(rpcUrl, config.commitment ?? "confirmed");
    this.programId = config.programId ?? SENTINEL_PROGRAM_ID;
  }

  // ══════════════════════════════════════════════════════════════
  // Wallet Operations
  // ══════════════════════════════════════════════════════════════

  /**
   * Create a new SmartWallet for the owner.
   *
   * @param owner - The owner keypair (will sign)
   * @param options - Spending limits and optional sponsor
   * @returns The created SmartWallet data
   */
  async createWallet(
    owner: Keypair,
    options: {
      dailyLimitSol: number;
      perTxLimitSol: number;
      /** Optional sponsor keypair that pays rent + tx fees */
      funder?: Keypair;
    }
  ): Promise<SmartWallet> {
    const funderKeypair = options.funder ?? owner;
    const params: CreateWalletParams = {
      owner: owner.publicKey,
      funder: funderKeypair.publicKey,
      dailyLimitLamports: solToLamports(options.dailyLimitSol),
      perTxLimitLamports: solToLamports(options.perTxLimitSol),
      programId: this.programId,
    };

    const ix = createWalletInstruction(params);
    const tx = new Transaction().add(ix);

    // When funder != owner, both must sign
    const signers =
      funderKeypair === owner ? [owner] : [funderKeypair, owner];

    await sendAndConfirmTransaction(this.connection, tx, signers);

    // Fetch and return the created wallet
    const [walletPda] = deriveWalletPda(owner.publicKey, this.programId);
    return this.getWallet(walletPda);
  }

  /**
   * Fetch a SmartWallet by its PDA address.
   */
  async getWallet(address: PublicKey): Promise<SmartWallet> {
    const account = await this.connection.getAccountInfo(address);
    if (!account) {
      throw new Error(`Wallet not found: ${address.toBase58()}`);
    }
    const wallet = deserializeSmartWallet(address, Buffer.from(account.data));
    if (!wallet) {
      throw new Error(`Failed to deserialize wallet: ${address.toBase58()}`);
    }
    return wallet;
  }

  /**
   * Get the wallet PDA for an owner.
   */
  getWalletAddress(owner: PublicKey): PublicKey {
    const [walletPda] = deriveWalletPda(owner, this.programId);
    return walletPda;
  }

  /**
   * Update spending limits on a wallet.
   */
  async updateSpendingLimits(
    owner: Keypair,
    options: {
      newDailyLimitSol: number;
      newPerTxLimitSol: number;
    }
  ): Promise<SmartWallet> {
    const params: UpdateSpendingLimitParams = {
      owner: owner.publicKey,
      newDailyLimitLamports: solToLamports(options.newDailyLimitSol),
      newPerTxLimitLamports: solToLamports(options.newPerTxLimitSol),
      programId: this.programId,
    };

    const ix = updateSpendingLimitInstruction(params);
    const tx = new Transaction().add(ix);

    await sendAndConfirmTransaction(this.connection, tx, [owner]);

    const [walletPda] = deriveWalletPda(owner.publicKey, this.programId);
    return this.getWallet(walletPda);
  }

  /**
   * Add a guardian to the wallet for recovery.
   */
  async addGuardian(owner: Keypair, guardian: PublicKey): Promise<SmartWallet> {
    const params: AddGuardianParams = {
      owner: owner.publicKey,
      guardian,
      programId: this.programId,
    };

    const ix = addGuardianInstruction(params);
    const tx = new Transaction().add(ix);

    await sendAndConfirmTransaction(this.connection, tx, [owner]);

    const [walletPda] = deriveWalletPda(owner.publicKey, this.programId);
    return this.getWallet(walletPda);
  }

  // ══════════════════════════════════════════════════════════════
  // Agent Operations
  // ══════════════════════════════════════════════════════════════

  /**
   * Register a new agent on the wallet.
   *
   * @param owner - The owner keypair (must sign)
   * @param agent - The agent's public key
   * @param options - Agent configuration
   * @returns The created AgentConfig
   */
  async registerAgent(
    owner: Keypair,
    agent: PublicKey,
    options: {
      name: string;
      dailyLimitSol: number;
      perTxLimitSol: number;
      allowedPrograms?: PublicKey[];
      defaultSessionDurationSecs?: number;
      maxSessionDurationSecs?: number;
    }
  ): Promise<AgentConfig> {
    const params: RegisterAgentParams = {
      owner: owner.publicKey,
      agent,
      name: options.name,
      dailyLimitLamports: solToLamports(options.dailyLimitSol),
      perTxLimitLamports: solToLamports(options.perTxLimitSol),
      allowedPrograms: options.allowedPrograms,
      defaultSessionDurationSecs: options.defaultSessionDurationSecs
        ? BigInt(options.defaultSessionDurationSecs)
        : undefined,
      maxSessionDurationSecs: options.maxSessionDurationSecs
        ? BigInt(options.maxSessionDurationSecs)
        : undefined,
      programId: this.programId,
    };

    const ix = registerAgentInstruction(params);
    const tx = new Transaction().add(ix);

    await sendAndConfirmTransaction(this.connection, tx, [owner]);

    // Fetch and return the created agent config
    const [walletPda] = deriveWalletPda(owner.publicKey, this.programId);
    const [agentPda] = deriveAgentPda(walletPda, agent, this.programId);
    return this.getAgentConfig(agentPda);
  }

  /**
   * Fetch an AgentConfig by its PDA address.
   */
  async getAgentConfig(address: PublicKey): Promise<AgentConfig> {
    const account = await this.connection.getAccountInfo(address);
    if (!account) {
      throw new Error(`Agent config not found: ${address.toBase58()}`);
    }
    const config = deserializeAgentConfig(address, Buffer.from(account.data));
    if (!config) {
      throw new Error(`Failed to deserialize agent config: ${address.toBase58()}`);
    }
    return config;
  }

  /**
   * Get the agent config PDA for a wallet + agent pair.
   */
  getAgentConfigAddress(walletOwner: PublicKey, agent: PublicKey): PublicKey {
    const [walletPda] = deriveWalletPda(walletOwner, this.programId);
    const [agentPda] = deriveAgentPda(walletPda, agent, this.programId);
    return agentPda;
  }

  /**
   * Deregister an agent (owner only).
   */
  async deregisterAgent(owner: Keypair, agent: PublicKey): Promise<void> {
    const params: DeregisterAgentParams = {
      owner: owner.publicKey,
      agent,
      programId: this.programId,
    };

    const ix = deregisterAgentInstruction(params);
    const tx = new Transaction().add(ix);

    await sendAndConfirmTransaction(this.connection, tx, [owner]);
  }

  // ══════════════════════════════════════════════════════════════
  // Session Operations
  // ══════════════════════════════════════════════════════════════

  /**
   * Create a new session key for an agent.
   *
   * @param agentKeypair - The agent keypair (must sign)
   * @param walletOwner - The wallet owner's public key
   * @param options - Session configuration
   * @returns The session keypair and created SessionKey data
   */
  async createSession(
    agentKeypair: Keypair,
    walletOwner: PublicKey,
    options: {
      durationSecs: number;
      maxAmountSol: number;
      maxPerTxSol: number;
    }
  ): Promise<{ sessionKeypair: Keypair; session: SessionKey }> {
    // Generate ephemeral session keypair
    const sessionKeypair = Keypair.generate();

    const params: CreateSessionParams = {
      agent: agentKeypair.publicKey,
      walletOwner,
      sessionPubkey: sessionKeypair.publicKey,
      durationSecs: BigInt(options.durationSecs),
      maxAmountLamports: solToLamports(options.maxAmountSol),
      maxPerTxLamports: solToLamports(options.maxPerTxSol),
      programId: this.programId,
    };

    const ix = createSessionInstruction(params);
    const tx = new Transaction().add(ix);

    await sendAndConfirmTransaction(this.connection, tx, [agentKeypair]);

    // Fetch the created session
    const [walletPda] = deriveWalletPda(walletOwner, this.programId);
    const [sessionPda] = deriveSessionPda(
      walletPda,
      agentKeypair.publicKey,
      sessionKeypair.publicKey,
      this.programId
    );
    const session = await this.getSession(sessionPda);

    return { sessionKeypair, session };
  }

  /**
   * Fetch a SessionKey by its PDA address.
   */
  async getSession(address: PublicKey): Promise<SessionKey> {
    const account = await this.connection.getAccountInfo(address);
    if (!account) {
      throw new Error(`Session not found: ${address.toBase58()}`);
    }
    const session = deserializeSessionKey(address, Buffer.from(account.data));
    if (!session) {
      throw new Error(`Failed to deserialize session: ${address.toBase58()}`);
    }
    return session;
  }

  /**
   * Revoke a session (owner or agent can do this).
   */
  async revokeSession(
    authority: Keypair,
    walletOwner: PublicKey,
    agent: PublicKey,
    sessionPubkey: PublicKey
  ): Promise<void> {
    const params: RevokeSessionParams = {
      authority: authority.publicKey,
      walletOwner,
      agent,
      sessionPubkey,
      programId: this.programId,
    };

    const ix = revokeSessionInstruction(params);
    const tx = new Transaction().add(ix);

    await sendAndConfirmTransaction(this.connection, tx, [authority]);
  }

  // ══════════════════════════════════════════════════════════════
  // Execute Operations (via Session Key)
  // ══════════════════════════════════════════════════════════════

  /**
   * Execute a transaction via a session key.
   *
   * This is the CORE method for autonomous agent operations.
   * The session key signs, and Sentinel validates/executes the CPI.
   *
   * @param sessionKeypair - The session keypair (signs the transaction)
   * @param walletOwner - The wallet owner's public key
   * @param agent - The agent's public key
   * @param targetProgram - The program to CPI into
   * @param amountLamports - Amount for spending limit tracking
   * @param innerInstructionData - The instruction data for the target CPI
   * @param remainingAccounts - Additional accounts for the CPI
   * @returns Transaction signature
   */
  async executeViaSession(
    sessionKeypair: Keypair,
    walletOwner: PublicKey,
    agent: PublicKey,
    targetProgram: PublicKey,
    amountLamports: bigint,
    innerInstructionData: Buffer,
    remainingAccounts: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[]
  ): Promise<string> {
    const params: ExecuteViaSessionParams = {
      sessionKey: sessionKeypair.publicKey,
      walletOwner,
      agent,
      sessionPubkey: sessionKeypair.publicKey,
      targetProgram,
      amountLamports,
      innerInstructionData,
      remainingAccounts,
      programId: this.programId,
    };

    const ix = executeViaSessionInstruction(params);
    const tx = new Transaction().add(ix);

    const signature = await sendAndConfirmTransaction(this.connection, tx, [
      sessionKeypair,
    ]);
    return signature;
  }

  // ══════════════════════════════════════════════════════════════
  // Recovery Operations
  // ══════════════════════════════════════════════════════════════

  /**
   * Recover a wallet by rotating the owner (guardian-initiated).
   *
   * ⚠️ CRITICAL: In v1, ANY single guardian can do this unilaterally.
   * See SECURITY.md for details on the risks.
   *
   * @param guardian - Guardian keypair (must be registered on wallet)
   * @param walletOwner - Current wallet owner's public key
   * @param newOwner - The new owner's public key
   */
  async recoverWallet(
    guardian: Keypair,
    walletOwner: PublicKey,
    newOwner: PublicKey
  ): Promise<SmartWallet> {
    const params: RecoverWalletParams = {
      guardian: guardian.publicKey,
      walletOwner,
      newOwner,
      programId: this.programId,
    };

    const ix = recoverWalletInstruction(params);
    const tx = new Transaction().add(ix);

    await sendAndConfirmTransaction(this.connection, tx, [guardian]);

    // Fetch updated wallet
    const [walletPda] = deriveWalletPda(walletOwner, this.programId);
    return this.getWallet(walletPda);
  }

  /**
   * Permanently close the SmartWallet and return rent to owner.
   *
   * Requirements:
   * - All agents must be deregistered first
   * - Only the owner can close
   *
   * @param owner - Owner keypair
   */
  async closeWallet(owner: Keypair): Promise<void> {
    const params: CloseWalletParams = {
      owner: owner.publicKey,
      programId: this.programId,
    };

    const ix = closeWalletInstruction(params);
    const tx = new Transaction().add(ix);

    await sendAndConfirmTransaction(this.connection, tx, [owner]);
  }
}

