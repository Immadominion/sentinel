# Function: updateSpendingLimitInstruction()

```ts
function updateSpendingLimitInstruction(params): TransactionInstruction;
```

Defined in: instructions.ts:430

Update the spending limits on a SmartWallet.

Accounts:
0. `[signer]` Owner
1. `[writable]` SmartWallet PDA

## Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`UpdateSpendingLimitParams`](Interface.UpdateSpendingLimitParams.md) |

## Returns

`TransactionInstruction`
