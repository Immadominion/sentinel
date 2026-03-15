import {
  Keypair,
  PublicKey,
  TransactionInstruction,
  Connection,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import type {
  SigilAgentConfig,
  SessionCredentials,
  SessionRequestOptions,
} from "./types.js";

const DEFAULT_API_URL = "https://sigil-backend-production-fd3d.up.railway.app";
const DEFAULT_REFRESH_THRESHOLD = 300; // 5 minutes
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

/**
 * SigilAgent — the primary class for agents to interact with Seal wallets.
 *
 * Usage:
 * ```ts
 * const agent = new SigilAgent({ pairingToken: "sgil_abc123..." });
 * const session = await agent.getSession();
 *
 * // Use session.sessionKeypair to sign transactions
 * // Use session.walletPda as the wallet authority in DLMM instructions
 * // Wrap instructions with agent.wrapInstruction(innerIx, amountLamports)
 * ```
 */
export class SigilAgent {
  private readonly pairingToken: string;
  private readonly apiUrl: string;
  private readonly rpcUrl: string;
  private readonly autoRefresh: boolean;
  private readonly refreshThresholdSecs: number;

  private credentials: SessionCredentials | null = null;
  private sessionKeypair: Keypair | null = null;
  private _connection: Connection | null = null;

  constructor(config: SigilAgentConfig) {
    if (!config.pairingToken.startsWith("sgil_")) {
      throw new Error("Invalid pairing token format. Expected: sgil_<token>");
    }

    this.pairingToken = config.pairingToken;
    this.apiUrl = config.apiUrl ?? DEFAULT_API_URL;
    this.rpcUrl = config.rpcUrl ?? clusterApiUrl("devnet");
    this.autoRefresh = config.autoRefresh ?? true;
    this.refreshThresholdSecs =
      config.refreshThresholdSecs ?? DEFAULT_REFRESH_THRESHOLD;
  }

  /**
   * Get a Solana Connection (lazily created, reused).
   */
  getConnection(): Connection {
    if (!this._connection) {
      this._connection = new Connection(this.rpcUrl, "confirmed");
    }
    return this._connection;
  }

  /**
   * Get or create a session. Returns cached session if still valid.
   * Automatically requests a new session if expired or about to expire.
   */
  async getSession(
    options?: SessionRequestOptions
  ): Promise<{
    credentials: SessionCredentials;
    sessionKeypair: Keypair;
    walletPda: PublicKey;
    agentConfigPda: PublicKey;
  }> {
    // Check if we have a valid, non-expiring session
    if (this.credentials && this.sessionKeypair) {
      const expiresAt = new Date(this.credentials.expiresAt).getTime();
      const remaining = (expiresAt - Date.now()) / 1000;

      if (remaining > this.refreshThresholdSecs) {
        return {
          credentials: this.credentials,
          sessionKeypair: this.sessionKeypair,
          walletPda: new PublicKey(this.credentials.walletPda),
          agentConfigPda: new PublicKey(this.credentials.agentConfigPda),
        };
      }
    }

    // Request new session
    const creds = await this.requestSession(options);
    this.credentials = creds;
    this.sessionKeypair = Keypair.fromSecretKey(
      Buffer.from(creds.sessionSecretKey, "base64")
    );

    return {
      credentials: creds,
      sessionKeypair: this.sessionKeypair,
      walletPda: new PublicKey(creds.walletPda),
      agentConfigPda: new PublicKey(creds.agentConfigPda),
    };
  }

  /**
   * Build an ExecuteViaSession wrapper instruction.
   * This wraps an inner instruction (e.g., DLMM addLiquidity) with Seal's
   * session-based authorization.
   */
  wrapInstruction(
    innerIx: TransactionInstruction,
    amountLamports: bigint = 0n
  ): TransactionInstruction {
    if (!this.credentials || !this.sessionKeypair) {
      throw new Error("No active session. Call getSession() first.");
    }

    const walletPda = new PublicKey(this.credentials.walletPda);
    const agentPda = new PublicKey(this.credentials.agentConfigPda);
    const sessionPda = new PublicKey(this.credentials.sessionPda);
    const sealProgramId = new PublicKey(
      "EV3TKRVz7pTHpAqBTjP8jmwuvoRBRCpjmVSPHhcMnXqb"
    );

    // Build remaining accounts from inner instruction
    const remainingAccounts = innerIx.keys.map((key) => ({
      pubkey: key.pubkey,
      isSigner: key.pubkey.equals(walletPda) ? false : key.isSigner,
      isWritable: key.isWritable,
    }));

    // Instruction data: [disc(1)] + [amount(8)] + [inner_data(N)]
    const amountBuf = Buffer.alloc(8);
    amountBuf.writeBigUInt64LE(amountLamports);

    const data = Buffer.concat([
      Buffer.from([3]), // ExecuteViaSession discriminant
      amountBuf,
      innerIx.data,
    ]);

    return new TransactionInstruction({
      programId: sealProgramId,
      keys: [
        {
          pubkey: this.sessionKeypair.publicKey,
          isSigner: true,
          isWritable: false,
        },
        { pubkey: walletPda, isSigner: false, isWritable: true },
        { pubkey: agentPda, isSigner: false, isWritable: true },
        { pubkey: sessionPda, isSigner: false, isWritable: true },
        { pubkey: innerIx.programId, isSigner: false, isWritable: false },
        ...remainingAccounts,
      ],
      data,
    });
  }

  /**
   * Build a TransferLamports instruction (disc 13) to transfer SOL from
   * the Seal wallet PDA to a destination. Unlike wrapInstruction() which
   * goes through ExecuteViaSession and checks allowed_programs, this uses
   * the native Seal TransferLamports instruction which directly debits/credits
   * lamports on the wallet PDA without program allowlist checks.
   */
  buildTransferSol(
    destination: PublicKey,
    amountLamports: bigint
  ): TransactionInstruction {
    if (!this.credentials || !this.sessionKeypair) {
      throw new Error("No active session. Call getSession() first.");
    }

    const walletPda = new PublicKey(this.credentials.walletPda);
    const agentPda = new PublicKey(this.credentials.agentConfigPda);
    const sessionPda = new PublicKey(this.credentials.sessionPda);
    const sealProgramId = new PublicKey(
      "EV3TKRVz7pTHpAqBTjP8jmwuvoRBRCpjmVSPHhcMnXqb"
    );

    // Instruction data: [disc(1)] + [amount(8)]
    const data = Buffer.alloc(9);
    data[0] = 13; // TransferLamports discriminant
    data.writeBigUInt64LE(amountLamports, 1);

    return new TransactionInstruction({
      programId: sealProgramId,
      keys: [
        { pubkey: this.sessionKeypair.publicKey, isSigner: true, isWritable: false },
        { pubkey: walletPda, isSigner: false, isWritable: true },
        { pubkey: agentPda, isSigner: false, isWritable: true },
        { pubkey: sessionPda, isSigner: false, isWritable: true },
        { pubkey: destination, isSigner: false, isWritable: true },
      ],
      data,
    });
  }

  /**
   * Send a heartbeat to the Sigil backend.
   */
  async heartbeat(
    status: "active" | "idle" | "trading" = "active",
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!this.credentials) return;

    await this.apiRequestWithRetry("/api/agent/session/heartbeat", {
      method: "POST",
      body: JSON.stringify({
        sessionPda: this.credentials.sessionPda,
        status,
        metadata,
      }),
    });
  }

  // ═══════════════════════════════════════════════════════════
  // High-level convenience methods
  // ═══════════════════════════════════════════════════════════

  /**
   * Transfer SOL from the Seal wallet to a destination address.
   *
   * This is the recommended high-level method for sending SOL.
   * It handles session management, TX building, signing, and submission.
   *
   * @param destination  Recipient public key (or base58 string)
   * @param amountSol    Amount in SOL (e.g. 0.5 for half a SOL)
   * @returns Transaction signature
   */
  async sendTransferSol(
    destination: PublicKey | string,
    amountSol: number
  ): Promise<string> {
    const destPubkey =
      typeof destination === "string"
        ? new PublicKey(destination)
        : destination;

    const amountLamports = BigInt(Math.round(amountSol * LAMPORTS_PER_SOL));
    if (amountLamports <= 0n) {
      throw new Error("Amount must be greater than 0");
    }

    // Ensure we have an active session
    const { sessionKeypair } = await this.getSession();
    const connection = this.getConnection();

    // Build the TransferLamports instruction
    const ix = this.buildTransferSol(destPubkey, amountLamports);

    // Build, sign, and send the transaction
    const tx = new Transaction().add(ix);
    tx.feePayer = sessionKeypair.publicKey;

    return sendAndConfirmTransaction(connection, tx, [sessionKeypair]);
  }

  /**
   * Get the SOL balance of the Seal wallet PDA.
   *
   * @returns Balance in SOL
   */
  async getWalletBalance(): Promise<number> {
    // Ensure we have credentials (need walletPda)
    if (!this.credentials) {
      await this.getSession();
    }
    const walletPda = new PublicKey(this.credentials!.walletPda);
    const connection = this.getConnection();
    const lamports = await connection.getBalance(walletPda);
    return lamports / LAMPORTS_PER_SOL;
  }

  /**
   * Get the SOL balance of the session keypair (for fees).
   *
   * @returns Balance in SOL
   */
  async getSessionBalance(): Promise<number> {
    if (!this.sessionKeypair) {
      await this.getSession();
    }
    const connection = this.getConnection();
    const lamports = await connection.getBalance(this.sessionKeypair!.publicKey);
    return lamports / LAMPORTS_PER_SOL;
  }

  /**
   * Get the current session keypair (for signing transactions).
   */
  getSessionKeypair(): Keypair {
    if (!this.sessionKeypair) {
      throw new Error("No active session. Call getSession() first.");
    }
    return this.sessionKeypair;
  }

  /**
   * Get the wallet PDA (for use as authority in DLMM and other instructions).
   */
  getWalletPda(): PublicKey {
    if (!this.credentials) {
      throw new Error("No active session. Call getSession() first.");
    }
    return new PublicKey(this.credentials.walletPda);
  }

  /**
   * Check if the current session is still valid.
   */
  isSessionValid(): boolean {
    if (!this.credentials) return false;
    const expiresAt = new Date(this.credentials.expiresAt).getTime();
    return Date.now() < expiresAt;
  }

  // ═══════════════════════════════════════════════════════════
  // Private
  // ═══════════════════════════════════════════════════════════

  private async requestSession(
    options?: SessionRequestOptions
  ): Promise<SessionCredentials> {
    const response = await this.apiRequestWithRetry("/api/agent/session/request", {
      method: "POST",
      body: JSON.stringify({
        durationSecs: options?.durationSecs,
        maxAmountSol: options?.maxAmountSol,
        maxPerTxSol: options?.maxPerTxSol,
      }),
    });

    if (response.status === 202) {
      throw new Error(
        "Session request pending manual approval. Check the Sigil app to approve."
      );
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown" }));
      throw new Error(
        `Session request failed: ${error.error ?? response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Make an API request with exponential backoff retry for transient failures.
   * Retries on network errors and 5xx responses. Does NOT retry 4xx.
   */
  private async apiRequestWithRetry(
    path: string,
    init: RequestInit = {},
    retries = MAX_RETRIES
  ): Promise<Response> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.apiRequest(path, init);

        // Don't retry client errors (4xx) — they won't change
        if (response.status >= 400 && response.status < 500) {
          return response;
        }

        // Retry server errors (5xx)
        if (response.status >= 500 && attempt < retries) {
          const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retries) {
          const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError ?? new Error(`Request to ${path} failed after ${retries + 1} attempts`);
  }

  private async apiRequest(
    path: string,
    init: RequestInit = {}
  ): Promise<Response> {
    return fetch(`${this.apiUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.pairingToken}`,
        ...((init.headers as Record<string, string>) ?? {}),
      },
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
