# Function: deriveSessionPda()

```ts
function deriveSessionPda(
   wallet, 
   agent, 
   sessionPubkey, 
   programId?): [PublicKey, number];
```

Defined in: pda.ts:46

Derive the SessionKey PDA for a wallet + agent + session pubkey.
Seeds: ["session", wallet_pubkey, agent_pubkey, session_pubkey]

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `wallet` | `PublicKey` | `undefined` |
| `agent` | `PublicKey` | `undefined` |
| `sessionPubkey` | `PublicKey` | `undefined` |
| `programId` | `PublicKey` | `SEAL_PROGRAM_ID` |

## Returns

\[`PublicKey`, `number`\]
