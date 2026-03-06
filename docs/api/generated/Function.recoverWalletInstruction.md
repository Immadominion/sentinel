# Function: recoverWalletInstruction()

```ts
function recoverWalletInstruction(params): TransactionInstruction;
```

Defined in: [instructions.ts:562](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L562)

Recover a wallet by rotating the owner key (guardian-initiated, m-of-n threshold).

Multiple guardians must co-sign to reach the wallet's recovery_threshold.
All signing guardians must be unique and registered.

Accounts:
0..M `[signer]`   Guardians (M must be >= recovery_threshold)
M    `[writable]`  SmartWallet PDA

Data:
- `[0..32] new_owner: Pubkey` — the new owner public key

## Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`RecoverWalletParams`](Interface.RecoverWalletParams.md) |

## Returns

`TransactionInstruction`
