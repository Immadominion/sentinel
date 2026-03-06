# Function: deriveAgentPda()

```ts
function deriveAgentPda(
   wallet, 
   agent, 
   programId?): [PublicKey, number];
```

Defined in: [pda.ts:31](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/pda.ts#L31)

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
