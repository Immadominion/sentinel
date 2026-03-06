# Function: deriveWalletPda()

```ts
function deriveWalletPda(owner, programId?): [PublicKey, number];
```

Defined in: pda.ts:17

Derive the SmartWallet PDA for an owner.
Seeds: ["seal", owner_pubkey]

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `owner` | `PublicKey` | `undefined` |
| `programId` | `PublicKey` | `SEAL_PROGRAM_ID` |

## Returns

\[`PublicKey`, `number`\]
