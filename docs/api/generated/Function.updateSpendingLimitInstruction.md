# Function: updateSpendingLimitInstruction()

```ts
function updateSpendingLimitInstruction(params): TransactionInstruction;
```

Defined in: [instructions.ts:430](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L430)

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
