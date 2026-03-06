/**
 * Seal MCP Server — Tools Definition
 *
 * Defines all MCP tools that map to Seal smart wallet operations.
 * Each tool includes full Zod schemas for input validation.
 */

import { z } from "zod";

// ══════════════════════════════════════════════════════════════
// Common Schemas
// ══════════════════════════════════════════════════════════════

const PublicKeySchema = z
    .string()
    .min(32)
    .max(44)
    .describe("Base58-encoded Solana public key");

const KeypairSchema = z
    .string()
    .describe("Base58-encoded Solana keypair secret key (64 bytes)");

const NetworkSchema = z
    .enum(["mainnet", "devnet", "localnet"])
    .default("devnet")
    .describe("Solana network to connect to");

const SolAmountSchema = z
    .number()
    .positive()
    .describe("Amount in SOL (not lamports)");

// ══════════════════════════════════════════════════════════════
// Tool Definitions
// ══════════════════════════════════════════════════════════════

export const TOOL_DEFINITIONS = {
    // --- Wallet Operations ---
    create_wallet: {
        description:
            "Create a new Seal smart wallet on Solana. The wallet has spending limits, agent support, and guardian recovery. Returns the wallet PDA address and configuration.",
        inputSchema: z.object({
            ownerSecretKey: KeypairSchema.describe(
                "Owner's base58 secret key. The owner controls the wallet."
            ),
            dailyLimitSol: SolAmountSchema.describe(
                "Maximum SOL that agents can spend per 24h rolling window"
            ),
            perTxLimitSol: SolAmountSchema.describe(
                "Maximum SOL any single agent transaction can spend"
            ),
            network: NetworkSchema,
            rpcUrl: z.string().url().optional().describe("Custom RPC endpoint URL"),
        }),
    },

    get_wallet: {
        description:
            "Fetch a Seal smart wallet's on-chain data by the owner's public key. Returns spending limits, guardian list, and wallet status.",
        inputSchema: z.object({
            ownerPublicKey: PublicKeySchema.describe(
                "The wallet owner's public key"
            ),
            network: NetworkSchema,
            rpcUrl: z.string().url().optional(),
        }),
    },

    update_spending_limits: {
        description:
            "Update the daily and per-transaction spending limits on a Seal wallet. Only the owner can do this.",
        inputSchema: z.object({
            ownerSecretKey: KeypairSchema,
            newDailyLimitSol: SolAmountSchema,
            newPerTxLimitSol: SolAmountSchema,
            network: NetworkSchema,
            rpcUrl: z.string().url().optional(),
        }),
    },

    add_guardian: {
        description:
            "Add a guardian to the wallet for social recovery. Guardians can collectively vote (m-of-n threshold) to rotate the owner key if it's lost.",
        inputSchema: z.object({
            ownerSecretKey: KeypairSchema,
            guardianPublicKey: PublicKeySchema.describe(
                "Public key of the guardian to add"
            ),
            network: NetworkSchema,
            rpcUrl: z.string().url().optional(),
        }),
    },

    close_wallet: {
        description:
            "Permanently close a Seal smart wallet and return rent SOL to the owner. All agents must be deregistered first.",
        inputSchema: z.object({
            ownerSecretKey: KeypairSchema,
            network: NetworkSchema,
            rpcUrl: z.string().url().optional(),
        }),
    },

    // --- Agent Operations ---
    register_agent: {
        description:
            "Register an AI agent on a Seal wallet. Agents operate autonomously within spending limits and allowed program scopes. Returns the agent config PDA.",
        inputSchema: z.object({
            ownerSecretKey: KeypairSchema,
            agentPublicKey: PublicKeySchema.describe(
                "The agent's public key to register"
            ),
            name: z
                .string()
                .max(32)
                .describe("Human-readable agent name (max 32 chars)"),
            dailyLimitSol: SolAmountSchema.describe(
                "Agent-specific daily spending limit in SOL"
            ),
            perTxLimitSol: SolAmountSchema.describe(
                "Agent-specific per-transaction limit in SOL"
            ),
            allowedPrograms: z
                .array(PublicKeySchema)
                .optional()
                .describe(
                    "Allowlist of program IDs this agent can CPI into. Empty = no programs allowed (default-closed)."
                ),
            defaultSessionDurationSecs: z
                .number()
                .int()
                .positive()
                .optional()
                .describe("Default session duration in seconds"),
            maxSessionDurationSecs: z
                .number()
                .int()
                .positive()
                .optional()
                .describe("Maximum allowed session duration in seconds"),
            network: NetworkSchema,
            rpcUrl: z.string().url().optional(),
        }),
    },

    get_agent_config: {
        description:
            "Fetch an agent's on-chain configuration by wallet owner and agent public key. Returns spending limits, allowed programs, and session settings.",
        inputSchema: z.object({
            walletOwnerPublicKey: PublicKeySchema,
            agentPublicKey: PublicKeySchema,
            network: NetworkSchema,
            rpcUrl: z.string().url().optional(),
        }),
    },

    deregister_agent: {
        description:
            "Remove an agent from the wallet. Only the owner can do this. The agent will lose all permissions.",
        inputSchema: z.object({
            ownerSecretKey: KeypairSchema,
            agentPublicKey: PublicKeySchema,
            network: NetworkSchema,
            rpcUrl: z.string().url().optional(),
        }),
    },

    // --- Session Operations ---
    create_session: {
        description:
            "Create a new ephemeral session key for an agent. Sessions are time-limited and budget-capped. Returns the session keypair (SECRET — store securely) and session PDA.",
        inputSchema: z.object({
            agentSecretKey: KeypairSchema.describe(
                "The agent's secret key (agent must be registered on the wallet)"
            ),
            walletOwnerPublicKey: PublicKeySchema,
            durationSecs: z
                .number()
                .int()
                .positive()
                .describe("Session duration in seconds"),
            maxAmountSol: SolAmountSchema.describe(
                "Total SOL budget for the session"
            ),
            maxPerTxSol: SolAmountSchema.describe(
                "Per-transaction limit for this session"
            ),
            network: NetworkSchema,
            rpcUrl: z.string().url().optional(),
        }),
    },

    get_session: {
        description:
            "Fetch session key data. Returns expiry, remaining budget, and active status.",
        inputSchema: z.object({
            walletOwnerPublicKey: PublicKeySchema,
            agentPublicKey: PublicKeySchema,
            sessionPublicKey: PublicKeySchema,
            network: NetworkSchema,
            rpcUrl: z.string().url().optional(),
        }),
    },

    revoke_session: {
        description:
            "Revoke an active session key. Can be done by either the owner or the agent.",
        inputSchema: z.object({
            authoritySecretKey: KeypairSchema.describe(
                "Secret key of the owner or agent revoking the session"
            ),
            walletOwnerPublicKey: PublicKeySchema,
            agentPublicKey: PublicKeySchema,
            sessionPublicKey: PublicKeySchema,
            network: NetworkSchema,
            rpcUrl: z.string().url().optional(),
        }),
    },

    // --- Execute Operations ---
    execute_via_session: {
        description:
            "Execute a CPI (cross-program invocation) through a Seal session key. This is the core autonomous operation — the session key authorizes a transaction against a target program, with Seal enforcing spending limits. Returns the transaction signature.",
        inputSchema: z.object({
            sessionSecretKey: KeypairSchema.describe(
                "The session keypair's secret key"
            ),
            walletOwnerPublicKey: PublicKeySchema,
            agentPublicKey: PublicKeySchema,
            targetProgramId: PublicKeySchema.describe(
                "The program to invoke (must be in agent's allowed list)"
            ),
            amountSol: SolAmountSchema.describe(
                "Amount to track against spending limits"
            ),
            instructionData: z
                .string()
                .describe("Base64-encoded instruction data for the target program"),
            accounts: z
                .array(
                    z.object({
                        pubkey: PublicKeySchema,
                        isSigner: z.boolean(),
                        isWritable: z.boolean(),
                    })
                )
                .describe("Account metas for the CPI"),
            network: NetworkSchema,
            rpcUrl: z.string().url().optional(),
        }),
    },

    // --- PDA Derivation (read-only, no signing) ---
    derive_wallet_pda: {
        description:
            "Derive the wallet PDA address from an owner public key. Does not require network access.",
        inputSchema: z.object({
            ownerPublicKey: PublicKeySchema,
        }),
    },

    derive_agent_pda: {
        description:
            "Derive the agent config PDA address from wallet owner and agent public key.",
        inputSchema: z.object({
            walletOwnerPublicKey: PublicKeySchema,
            agentPublicKey: PublicKeySchema,
        }),
    },

    derive_session_pda: {
        description:
            "Derive the session PDA address from wallet owner, agent, and session public key.",
        inputSchema: z.object({
            walletOwnerPublicKey: PublicKeySchema,
            agentPublicKey: PublicKeySchema,
            sessionPublicKey: PublicKeySchema,
        }),
    },

    // --- Recovery ---
    recover_wallet: {
        description:
            "Rotate the wallet owner to a new key via guardian recovery. Requires `recovery_threshold` guardian co-signers and transfers wallet control to the new owner.",
        inputSchema: z.object({
            guardianSecretKeys: z
                .array(KeypairSchema)
                .min(1)
                .describe(
                    "Secret keys of the guardian co-signers (must meet recovery_threshold)"
                ),
            walletOwnerPublicKey: PublicKeySchema.describe(
                "Current wallet owner's public key"
            ),
            newOwnerPublicKey: PublicKeySchema.describe(
                "The new owner's public key that will take control"
            ),
            network: NetworkSchema,
            rpcUrl: z.string().url().optional(),
        }),
    },

    // --- Wallet Management ---
    lock_wallet: {
        description:
            "Emergency lock or unlock a wallet. When locked, all agent operations via ExecuteViaSession are blocked. Only the owner can lock/unlock.",
        inputSchema: z.object({
            ownerSecretKey: KeypairSchema,
            lock: z
                .boolean()
                .describe("true to lock, false to unlock"),
            network: NetworkSchema,
            rpcUrl: z.string().url().optional(),
        }),
    },

    remove_guardian: {
        description:
            "Remove a guardian from the wallet. Only the owner can do this. If the recovery threshold exceeds the new guardian count, it is automatically clamped.",
        inputSchema: z.object({
            ownerSecretKey: KeypairSchema,
            guardianPublicKey: PublicKeySchema.describe(
                "Public key of the guardian to remove"
            ),
            network: NetworkSchema,
            rpcUrl: z.string().url().optional(),
        }),
    },

    set_recovery_threshold: {
        description:
            "Set the m-of-n threshold for guardian recovery. Determines how many guardians must co-sign a RecoverWallet call. Must be between 1 and the current guardian count.",
        inputSchema: z.object({
            ownerSecretKey: KeypairSchema,
            threshold: z
                .number()
                .int()
                .min(1)
                .max(5)
                .describe("Recovery threshold (1 ≤ threshold ≤ guardian_count)"),
            network: NetworkSchema,
            rpcUrl: z.string().url().optional(),
        }),
    },
} as const;

export type ToolName = keyof typeof TOOL_DEFINITIONS;
