# Installation

## TypeScript SDK

Install the Sentinel TypeScript SDK from npm:

::: code-group

```sh [npm]
npm install @sentinel-wallet/sdk
```

```sh [pnpm]
pnpm add @sentinel-wallet/sdk
```

```sh [yarn]
yarn add @sentinel-wallet/sdk
```

:::

### Requirements

- **Node.js** 18+ (LTS recommended)
- **TypeScript** 5.0+ (optional but recommended)
- **@solana/web3.js** 1.87+ (peer dependency)

The SDK uses `BigInt` for all lamport values — ensure your `tsconfig.json` targets `ES2020` or later:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

### Verify Installation

```typescript
import { SentinelClient } from "@sentinel-wallet/sdk";

const client = new SentinelClient({ network: "devnet" });
console.log("Program ID:", client.programId.toBase58());
// → EV3TKRVz7pTHpAqBTjP8jmwuvoRBRCpjmVSPHhcMnXqb
```

## Dart SDK

The Dart SDK is under development at [`sdk/sentinel-dart/`](https://github.com/immadominion/sentinel/tree/main/sdk/sentinel-dart):

```yaml
# pubspec.yaml (coming soon)
dependencies:
  sentinel_dart: ^0.1.0
```

## Building from Source

Clone and build the Solana program locally:

```sh
git clone https://github.com/immadominion/sentinel.git
cd sentinel/programs/sentinel-wallet
```

### Program (Rust)

Requires Solana CLI 1.18+ and Rust 1.75+:

```sh
# Install Solana CLI if needed
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# Build the program
cargo build-sbf

# Run tests
cargo test-sbf
```

The compiled `.so` file appears in `target/deploy/sentinel_wallet.so`.

### Deploy to Devnet

```sh
solana config set --url devnet
solana program deploy target/deploy/sentinel_wallet.so
```

::: warning
Deploying to devnet requires ~2 SOL for program rent. Airdrop using `solana airdrop 2` first.
:::

### TypeScript SDK (from source)

```sh
cd sdk/sentinel-ts
npm install
npm run build
```

## Environment Setup

### RPC Endpoints

The SDK connects to default Solana RPC endpoints:

| Network | URL |
|---------|-----|
| Devnet | `https://api.devnet.solana.com` |
| Mainnet | `https://api.mainnet-beta.solana.com` |
| Localnet | `http://localhost:8899` |

For production workloads, use a dedicated RPC provider (Helius, Triton, QuickNode) to avoid rate limits:

```typescript
const client = new SentinelClient({
  rpcUrl: "https://devnet.helius-rpc.com/?api-key=YOUR_KEY",
});
```

### Wallet Setup

Sentinel requires a Solana keypair for the owner. Generate one for testing:

```sh
solana-keygen new --outfile ./test-wallet.json
solana airdrop 2 --url devnet
```

::: danger
Never commit keypair files to version control. Add `*.json` to your `.gitignore` if it contains wallet files.
:::
