# Function: closeWalletInstruction()

```ts
function closeWalletInstruction(params): TransactionInstruction;
```

Defined in: [instructions.ts:609](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L609)

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
