# Function: revokeSessionInstruction()

```ts
function revokeSessionInstruction(params): TransactionInstruction;
```

Defined in: [instructions.ts:269](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L269)

Revoke a session key (owner or agent can do this).

Accounts:
0. `[signer]` Authority (owner or agent)
1. `[writable]` SessionKey PDA
2. `[]` SmartWallet PDA (to verify ownership)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`RevokeSessionParams`](Interface.RevokeSessionParams.md) |

## Returns

`TransactionInstruction`
