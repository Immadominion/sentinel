# Function: revokeSessionInstruction()

```ts
function revokeSessionInstruction(params): TransactionInstruction;
```

Defined in: instructions.ts:269

Revoke a session key (owner or agent can do this).

Accounts:
0. `[signer]` Authority (owner or agent)
1. `[]` SmartWallet PDA (to verify ownership)
2. `[writable]` SessionKey PDA

## Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`RevokeSessionParams`](Interface.RevokeSessionParams.md) |

## Returns

`TransactionInstruction`
