/**
 * Environment configuration with Zod validation.
 */

import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    SOLANA_NETWORK: z.enum(["mainnet-beta", "devnet", "localnet"]).default("devnet"),
    SOLANA_RPC_URL: z.string().url().default("https://api.devnet.solana.com"),
    SENTINEL_PROGRAM_ID: z.string().min(32).max(50),
    AGENT_KEYPAIR_PATH: z.string().optional(),
    CORS_ORIGINS: z.string().default("*"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("☒ Invalid environment variables:");
    console.error(parsed.error.format());
    process.exit(1);
}

export const config = parsed.data;

export default config;
