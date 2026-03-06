# Seal Express API Template

> **Starter template** — a minimal Express 5 REST API showing how to integrate with Seal smart wallets on Solana. For production, see [`sage-backend`](https://github.com/immadominion/seal) which adds auth, DB, sponsor support, and the full trading engine.

## Quick Start

```bash
# Install dependencies
npm install

# Create .env from example
cp .env.example .env

# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `SOLANA_NETWORK` | Solana network | `devnet` |
| `SOLANA_RPC_URL` | RPC endpoint | `https://api.devnet.solana.com` |
| `SEAL_PROGRAM_ID` | Deployed program ID | Required |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |

## API Endpoints

### Health

```
GET /health
```

Returns server status, network info, and current slot.

### Wallet

```
POST /wallet/prepare-create
```

Body:

```json
{
  "owner": "<owner-pubkey>",
  "dailyLimitSol": 10,
  "perTxLimitSol": 1
}
```

Returns unsigned transaction for wallet creation. Mobile app signs via MWA.

```
GET /wallet/:address
```

Get wallet state by PDA address.

```
GET /wallet/by-owner/:owner
```

Derive wallet PDA from owner pubkey and fetch state.

```
GET /wallet/:address/balance
```

Get SOL balance of wallet PDA.

### Agent

```
POST /agent/prepare-register
```

Body:

```json
{
  "owner": "<owner-pubkey>",
  "agent": "<agent-pubkey>",
  "name": "Sage Agent",
  "dailyLimitSol": 2,
  "perTxLimitSol": 0.5,
  "allowedPrograms": ["<program1>", "<program2>"]
}
```

Returns unsigned transaction for agent registration.

```
GET /agent/:configAddress
```

Get agent config by PDA address.

```
GET /agent/by-wallet/:walletAddress/:agentPubkey
```

Derive agent config PDA and fetch state.

### Session

```
POST /session/prepare-create
```

Body:

```json
{
  "owner": "<owner-pubkey>",
  "agent": "<agent-pubkey>",
  "sessionId": 1,
  "expirySeconds": 3600,
  "maxAmountSol": 1,
  "maxPerTxSol": 0.1
}
```

Returns unsigned transaction for session creation.

```
POST /session/prepare-revoke
```

Body:

```json
{
  "revoker": "<owner-or-agent-pubkey>",
  "agent": "<agent-pubkey>",
  "sessionId": 1
}
```

Returns unsigned transaction for session revocation.

```
GET /session/:sessionAddress
```

Get session state by PDA address.

```
GET /session/by-agent/:agentPubkey/:sessionId
```

Derive session PDA and fetch state.

## Mobile Integration Flow

1. **Create Wallet**:
   - App calls `POST /wallet/prepare-create`
   - App receives unsigned transaction
   - App signs via MWA (Solana Mobile Wallet Adapter)
   - App submits signed transaction to network

2. **Register Agent** (same pattern):
   - `POST /agent/prepare-register`
   - Sign + submit

3. **Create Session** (same pattern):
   - `POST /session/prepare-create`
   - Sign + submit

4. **Agent Operations** (server-side):
   - Agent keypair signs session executions
   - Backend can execute trades within session limits

## Development

```bash
# Type check
npx tsc --noEmit

# Watch mode
npm run dev
```

## Tech Stack

- **Express 5.2.1** - Latest stable Express
- **TypeScript 5.9** - Type safety
- **Zod 3.25** - Runtime validation
- **@solana/web3.js 1.98** - Solana SDK
- **tsx** - Fast TypeScript execution

## License

Apache-2.0
