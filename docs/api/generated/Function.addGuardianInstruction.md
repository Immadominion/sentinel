# Function: addGuardianInstruction()

```ts
function addGuardianInstruction(params): TransactionInstruction;
```

Defined in: instructions.ts:472

Add a guardian to the SmartWallet for recovery.

Accounts:
0. `[signer]` Owner
1. `[writable]` SmartWallet PDA

## Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`AddGuardianParams`](Interface.AddGuardianParams.md) |

## Returns

`TransactionInstruction`
