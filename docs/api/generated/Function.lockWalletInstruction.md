# Function: lockWalletInstruction()

```ts
function lockWalletInstruction(params): TransactionInstruction;
```

Defined in: [instructions.ts:653](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L653)

Lock or unlock a wallet (owner-only emergency toggle).

When locked, ALL agent operations via ExecuteViaSession are blocked.
The owner can unlock at any time.

Accounts:
0. `[signer]`    Owner
1. `[writable]`  SmartWallet PDA

Data:
- `[0] lock_flag: u8` — 1 = lock, 0 = unlock

## Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`LockWalletParams`](Interface.LockWalletParams.md) |

## Returns

`TransactionInstruction`
