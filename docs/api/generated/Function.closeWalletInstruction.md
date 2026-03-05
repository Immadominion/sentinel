# Function: closeWalletInstruction()

```ts
function closeWalletInstruction(params): TransactionInstruction;
```

Defined in: instructions.ts:607

Permanently close the SmartWallet (returns rent to owner).

Requirements:
- All agents must be deregistered first (agent_count must be 0)
- Only the owner can close the wallet

Accounts:
0. `[signer, writable]` Owner (receives rent refund)
1. `[writable]`         SmartWallet PDA (will be closed)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`CloseWalletParams`](Interface.CloseWalletParams.md) |

## Returns

`TransactionInstruction`
