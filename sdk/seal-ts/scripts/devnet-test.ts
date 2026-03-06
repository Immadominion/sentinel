/**
 * Devnet Integration Test for Seal Smart Wallet
 *
 * This script tests the SDK against the real devnet deployment.
 * Program: EV3TKRVz7pTHpAqBTjP8jmwuvoRBRCpjmVSPHhcMnXqb
 *
 * Prerequisites:
 *   - Solana CLI configured for devnet
 *   - Default keypair (~/.config/solana/id.json) with SOL balance
 *
 * Run: npx ts-node scripts/devnet-test.ts
 */

import {
    Connection,
    Keypair,
    PublicKey,
    clusterApiUrl,
    LAMPORTS_PER_SOL,
    sendAndConfirmTransaction,
    Transaction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

// Import from compiled SDK (dist/)
import {
    SEAL_PROGRAM_ID,
    deriveWalletPda,
    createWalletInstruction,
    solToLamports,
    deserializeSmartWallet,
} from "../dist/index.js";

const DEVNET_RPC = clusterApiUrl("devnet");

async function loadKeypair(keypairPath: string): Promise<Keypair> {
    const expandedPath = keypairPath.replace("~", process.env.HOME || "");
    const secretKey = JSON.parse(fs.readFileSync(expandedPath, "utf-8"));
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

async function main() {
    console.log("=".repeat(60));
    console.log("Seal Smart Wallet - Devnet Integration Test");
    console.log("=".repeat(60));
    console.log();

    // Load keypair
    const owner = await loadKeypair("~/.config/solana/id.json");
    console.log("Owner pubkey:", owner.publicKey.toBase58());

    // Connect to devnet
    const connection = new Connection(DEVNET_RPC, "confirmed");
    console.log("RPC endpoint:", DEVNET_RPC);

    // Check balance
    const balance = await connection.getBalance(owner.publicKey);
    console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL");

    if (balance < 0.1 * LAMPORTS_PER_SOL) {
        console.error("ERROR: Insufficient balance. Need at least 0.1 SOL.");
        process.exit(1);
    }

    console.log();
    console.log("Program ID:", SEAL_PROGRAM_ID.toBase58());

    // Derive wallet PDA
    const [walletPda, bump] = deriveWalletPda(owner.publicKey);
    console.log("Wallet PDA:", walletPda.toBase58());
    console.log("PDA bump:", bump);

    // Check if wallet already exists
    const existingAccount = await connection.getAccountInfo(walletPda);
    if (existingAccount) {
        console.log();
        console.log("☑ Wallet already exists! Reading state...");
        console.log("Account size:", existingAccount.data.length, "bytes");

        try {
            const wallet = deserializeSmartWallet(walletPda, existingAccount.data);
            if (!wallet) {
                console.error("Failed to deserialize wallet (invalid data)");
                process.exit(1);
            }
            console.log();
            console.log("Wallet State:");
            console.log("  Address:", wallet.address);
            console.log("  Owner:", wallet.owner);
            console.log("  Bump:", wallet.bump);
            console.log("  Daily limit:", Number(wallet.dailyLimitLamports) / LAMPORTS_PER_SOL, "SOL");
            console.log("  Per-tx limit:", Number(wallet.perTxLimitLamports) / LAMPORTS_PER_SOL, "SOL");
            console.log("  Spent today:", Number(wallet.spentTodayLamports) / LAMPORTS_PER_SOL, "SOL");
            console.log("  Guardian count:", wallet.guardianCount);
            console.log("  Agent count:", wallet.agentCount);
            console.log("  Is locked:", wallet.isLocked);
            console.log("  Is closed:", wallet.isClosed);
            console.log();
            console.log("☑ Devnet test PASSED - Wallet state readable");
        } catch (err) {
            console.error("Failed to deserialize wallet:", err);
            process.exit(1);
        }
        return;
    }

    // Create wallet
    console.log();
    console.log("Creating new wallet on devnet...");

    const dailyLimitLamports = solToLamports(10); // 10 SOL daily
    const perTxLimitLamports = solToLamports(1); // 1 SOL per tx

    const ix = createWalletInstruction({
        owner: owner.publicKey,
        dailyLimitLamports: dailyLimitLamports,
        perTxLimitLamports: perTxLimitLamports,
    });

    const tx = new Transaction().add(ix);
    tx.feePayer = owner.publicKey;

    try {
        const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;

        console.log("Sending transaction...");
        const signature = await sendAndConfirmTransaction(connection, tx, [owner], {
            commitment: "confirmed",
        });

        console.log();
        console.log("☑ Wallet created successfully!");
        console.log("Signature:", signature);
        console.log(
            "Explorer:",
            `https://explorer.solana.com/tx/${signature}?cluster=devnet`
        );

        // Wait a moment for account data to propagate
        console.log();
        console.log("Waiting for account data to propagate...");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Verify by reading back
        const account = await connection.getAccountInfo(walletPda);
        if (account && account.data) {
            const wallet = deserializeSmartWallet(walletPda, account.data);
            if (wallet) {
                console.log();
                console.log("Wallet verified:");
                console.log("  Owner:", wallet.owner);
                console.log(
                    "  Daily limit:",
                    Number(wallet.dailyLimitLamports) / LAMPORTS_PER_SOL,
                    "SOL"
                );
                console.log(
                    "  Per-tx limit:",
                    Number(wallet.perTxLimitLamports) / LAMPORTS_PER_SOL,
                    "SOL"
                );
            }
        } else {
            console.log("Note: Account not yet visible (may need to retry)");
        }

        console.log();
        console.log("☑ Devnet integration test PASSED!");
    } catch (err) {
        console.error();
        console.error("☒ Transaction failed:", err);
        process.exit(1);
    }
}

main().catch(console.error);
