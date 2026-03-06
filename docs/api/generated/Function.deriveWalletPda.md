# Function: deriveWalletPda()

```ts
function deriveWalletPda(owner, programId?): [PublicKey, number];
```

Defined in: [pda.ts:17](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/pda.ts#L17)

Derive the SmartWallet PDA for an owner.
Seeds: ["seal", owner_pubkey]

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `owner` | `PublicKey` | `undefined` |
| `programId` | `PublicKey` | `SEAL_PROGRAM_ID` |

## Returns

\[`PublicKey`, `number`\]
