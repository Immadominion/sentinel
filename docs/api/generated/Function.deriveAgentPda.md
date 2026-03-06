# Function: deriveAgentPda()

```ts
function deriveAgentPda(
   wallet, 
   agent, 
   programId?): [PublicKey, number];
```

Defined in: pda.ts:31

Derive the AgentConfig PDA for a wallet + agent pair.
Seeds: ["agent", wallet_pubkey, agent_pubkey]

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `wallet` | `PublicKey` | `undefined` |
| `agent` | `PublicKey` | `undefined` |
| `programId` | `PublicKey` | `SEAL_PROGRAM_ID` |

## Returns

\[`PublicKey`, `number`\]
