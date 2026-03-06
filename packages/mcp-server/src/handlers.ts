/**
 * Seal MCP Server — Tool Handlers
 *
 * Implements the actual logic for each MCP tool by delegating to the Seal SDK.
 */

import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";
import {
    SealClient,
    deriveWalletPda,
    deriveAgentPda,
    deriveSessionPda,
    isSessionValid,
    getSessionRemainingBudget,
} from "@seal-wallet/sdk";
import type { ToolName } from "./tools.js";

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

function keypairFromBase58(secretKey: string): Keypair {
    return Keypair.fromSecretKey(bs58.decode(secretKey));
}

function makeClient(
    network: "mainnet" | "devnet" | "localnet" = "devnet",
    rpcUrl?: string
) {
    return new SealClient({
        network,
        rpcUrl: rpcUrl ?? undefined,
    });
}

function formatLamports(lamports: bigint | number): string {
    return `${Number(BigInt(lamports)) / LAMPORTS_PER_SOL} SOL`;
}

function walletToJson(w: any) {
    return {
        address: w.address.toBase58(),
        owner: w.owner.toBase58(),
        dailyLimit: formatLamports(w.dailyLimit),
        perTxLimit: formatLamports(w.perTxLimit),
        dailySpent: formatLamports(w.dailySpent),
        guardians: w.guardians.map((g: PublicKey) => g.toBase58()),
        isLocked: w.isLocked,
        agentCount: w.agentCount,
    };
}

function agentToJson(a: any) {
    return {
        address: a.address.toBase58(),
        wallet: a.wallet.toBase58(),
        agent: a.agent.toBase58(),
        name: a.name,
        dailyLimit: formatLamports(a.dailyLimit),
        perTxLimit: formatLamports(a.perTxLimit),
        dailySpent: formatLamports(a.dailySpent),
        allowedPrograms: a.allowedPrograms.map((p: PublicKey) => p.toBase58()),
        isActive: a.isActive,
    };
}

function sessionToJson(s: any) {
    return {
        address: s.address.toBase58(),
        wallet: s.wallet.toBase58(),
        agent: s.agent.toBase58(),
        sessionKey: s.sessionKey.toBase58(),
        expiresAt: new Date(Number(s.expiresAt) * 1000).toISOString(),
        maxAmount: formatLamports(s.maxAmount),
        maxPerTx: formatLamports(s.maxPerTx),
        amountUsed: formatLamports(s.amountUsed),
        remainingBudget: formatLamports(getSessionRemainingBudget(s)),
        isValid: isSessionValid(s),
        isRevoked: s.isRevoked,
    };
}

// ══════════════════════════════════════════════════════════════
// Handler Registry
// ══════════════════════════════════════════════════════════════

type HandlerResult = { content: { type: "text"; text: string }[] };

export async function handleTool(
    name: string,
    args: Record<string, unknown>
): Promise<HandlerResult> {
    const handler = handlers[name as ToolName];
    if (!handler) {
        return {
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
        };
    }

    try {
        const result = await handler(args);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    } catch (error: any) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(
                        {
                            error: error.message ?? String(error),
                            hint: "Check that keys are valid, the wallet exists, and the network is correct.",
                        },
                        null,
                        2
                    ),
                },
            ],
        };
    }
}

const handlers: Record<ToolName, (args: any) => Promise<any>> = {
    // ── Wallet ────────────────────────────────────────────────
    async create_wallet(args) {
        const owner = keypairFromBase58(args.ownerSecretKey);
        const client = makeClient(args.network, args.rpcUrl);

        const wallet = await client.createWallet(owner, {
            dailyLimitSol: args.dailyLimitSol,
            perTxLimitSol: args.perTxLimitSol,
        });

        return {
            success: true,
            wallet: walletToJson(wallet),
            walletAddress: client.getWalletAddress(owner.publicKey).toBase58(),
        };
    },

    async get_wallet(args) {
        const client = makeClient(args.network, args.rpcUrl);
        const ownerPubkey = new PublicKey(args.ownerPublicKey);
        const walletAddress = client.getWalletAddress(ownerPubkey);
        const wallet = await client.getWallet(walletAddress);

        return {
            wallet: walletToJson(wallet),
        };
    },

    async update_spending_limits(args) {
        const owner = keypairFromBase58(args.ownerSecretKey);
        const client = makeClient(args.network, args.rpcUrl);

        const wallet = await client.updateSpendingLimits(owner, {
            newDailyLimitSol: args.newDailyLimitSol,
            newPerTxLimitSol: args.newPerTxLimitSol,
        });

        return {
            success: true,
            wallet: walletToJson(wallet),
        };
    },

    async add_guardian(args) {
        const owner = keypairFromBase58(args.ownerSecretKey);
        const guardian = new PublicKey(args.guardianPublicKey);
        const client = makeClient(args.network, args.rpcUrl);

        const wallet = await client.addGuardian(owner, guardian);

        return {
            success: true,
            wallet: walletToJson(wallet),
        };
    },

    async close_wallet(args) {
        const owner = keypairFromBase58(args.ownerSecretKey);
        const client = makeClient(args.network, args.rpcUrl);

        await client.closeWallet(owner);

        return {
            success: true,
            message: "Wallet closed. Rent returned to owner.",
        };
    },

    // ── Agent ─────────────────────────────────────────────────
    async register_agent(args) {
        const owner = keypairFromBase58(args.ownerSecretKey);
        const agentPubkey = new PublicKey(args.agentPublicKey);
        const client = makeClient(args.network, args.rpcUrl);

        const agentConfig = await client.registerAgent(owner, agentPubkey, {
            name: args.name,
            dailyLimitSol: args.dailyLimitSol,
            perTxLimitSol: args.perTxLimitSol,
            allowedPrograms: args.allowedPrograms?.map(
                (p: string) => new PublicKey(p)
            ),
            defaultSessionDurationSecs: args.defaultSessionDurationSecs,
            maxSessionDurationSecs: args.maxSessionDurationSecs,
        });

        return {
            success: true,
            agentConfig: agentToJson(agentConfig),
            agentConfigAddress: client
                .getAgentConfigAddress(owner.publicKey, agentPubkey)
                .toBase58(),
        };
    },

    async get_agent_config(args) {
        const client = makeClient(args.network, args.rpcUrl);
        const ownerPubkey = new PublicKey(args.walletOwnerPublicKey);
        const agentPubkey = new PublicKey(args.agentPublicKey);
        const address = client.getAgentConfigAddress(ownerPubkey, agentPubkey);
        const agentConfig = await client.getAgentConfig(address);

        return {
            agentConfig: agentToJson(agentConfig),
        };
    },

    async deregister_agent(args) {
        const owner = keypairFromBase58(args.ownerSecretKey);
        const agentPubkey = new PublicKey(args.agentPublicKey);
        const client = makeClient(args.network, args.rpcUrl);

        await client.deregisterAgent(owner, agentPubkey);

        return {
            success: true,
            message: `Agent ${agentPubkey.toBase58()} deregistered.`,
        };
    },

    // ── Session ───────────────────────────────────────────────
    async create_session(args) {
        const agent = keypairFromBase58(args.agentSecretKey);
        const walletOwner = new PublicKey(args.walletOwnerPublicKey);
        const client = makeClient(args.network, args.rpcUrl);

        const { sessionKeypair, session } = await client.createSession(
            agent,
            walletOwner,
            {
                durationSecs: args.durationSecs,
                maxAmountSol: args.maxAmountSol,
                maxPerTxSol: args.maxPerTxSol,
            }
        );

        return {
            success: true,
            session: sessionToJson(session),
            // ⚠️ The session secret key is returned so the agent can use it for executeViaSession.
            // This MUST be stored securely and never logged publicly.
            sessionSecretKey: bs58.encode(sessionKeypair.secretKey),
            sessionPublicKey: sessionKeypair.publicKey.toBase58(),
        };
    },

    async get_session(args) {
        const client = makeClient(args.network, args.rpcUrl);
        const walletOwner = new PublicKey(args.walletOwnerPublicKey);
        const agentPubkey = new PublicKey(args.agentPublicKey);
        const sessionPubkey = new PublicKey(args.sessionPublicKey);

        const [walletPda] = deriveWalletPda(walletOwner);
        const [sessionPda] = deriveSessionPda(walletPda, agentPubkey, sessionPubkey);
        const session = await client.getSession(sessionPda);

        return {
            session: sessionToJson(session),
        };
    },

    async revoke_session(args) {
        const authority = keypairFromBase58(args.authoritySecretKey);
        const walletOwner = new PublicKey(args.walletOwnerPublicKey);
        const agentPubkey = new PublicKey(args.agentPublicKey);
        const sessionPubkey = new PublicKey(args.sessionPublicKey);
        const client = makeClient(args.network, args.rpcUrl);

        await client.revokeSession(
            authority,
            walletOwner,
            agentPubkey,
            sessionPubkey
        );

        return {
            success: true,
            message: "Session revoked.",
        };
    },

    // ── Execute ───────────────────────────────────────────────
    async execute_via_session(args) {
        const sessionKeypair = keypairFromBase58(args.sessionSecretKey);
        const walletOwner = new PublicKey(args.walletOwnerPublicKey);
        const agentPubkey = new PublicKey(args.agentPublicKey);
        const targetProgram = new PublicKey(args.targetProgramId);
        const client = makeClient(args.network, args.rpcUrl);

        const amountLamports = BigInt(
            Math.round(args.amountSol * LAMPORTS_PER_SOL)
        );
        const instructionData = Buffer.from(args.instructionData, "base64");
        const remainingAccounts = args.accounts.map(
            (acc: { pubkey: string; isSigner: boolean; isWritable: boolean }) => ({
                pubkey: new PublicKey(acc.pubkey),
                isSigner: acc.isSigner,
                isWritable: acc.isWritable,
            })
        );

        const signature = await client.executeViaSession(
            sessionKeypair,
            walletOwner,
            agentPubkey,
            targetProgram,
            amountLamports,
            instructionData,
            remainingAccounts
        );

        return {
            success: true,
            signature,
            explorerUrl: `https://explorer.solana.com/tx/${signature}`,
        };
    },

    // ── PDA Derivation (offline) ──────────────────────────────
    async derive_wallet_pda(args) {
        const owner = new PublicKey(args.ownerPublicKey);
        const [pda, bump] = deriveWalletPda(owner);

        return {
            walletPda: pda.toBase58(),
            bump,
        };
    },

    async derive_agent_pda(args) {
        const walletOwner = new PublicKey(args.walletOwnerPublicKey);
        const agent = new PublicKey(args.agentPublicKey);
        const [walletPda] = deriveWalletPda(walletOwner);
        const [pda, bump] = deriveAgentPda(walletPda, agent);

        return {
            agentConfigPda: pda.toBase58(),
            bump,
        };
    },

    async derive_session_pda(args) {
        const walletOwner = new PublicKey(args.walletOwnerPublicKey);
        const agent = new PublicKey(args.agentPublicKey);
        const session = new PublicKey(args.sessionPublicKey);
        const [walletPda] = deriveWalletPda(walletOwner);
        const [pda, bump] = deriveSessionPda(walletPda, agent, session);

        return {
            sessionPda: pda.toBase58(),
            bump,
        };
    },

    // ── Recovery ──────────────────────────────────────────────
    async recover_wallet(args) {
        const guardian = keypairFromBase58(args.guardianSecretKey);
        const walletOwner = new PublicKey(args.walletOwnerPublicKey);
        const newOwner = new PublicKey(args.newOwnerPublicKey);
        const client = makeClient(args.network, args.rpcUrl);

        const wallet = await client.recoverWallet(guardian, walletOwner, newOwner);

        return {
            success: true,
            message: `Wallet ownership transferred to ${newOwner.toBase58()}`,
            wallet: walletToJson(wallet),
        };
    },
};
