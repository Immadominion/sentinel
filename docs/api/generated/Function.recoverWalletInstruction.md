# Function: recoverWalletInstruction()

```ts
function recoverWalletInstruction(params): TransactionInstruction;
```

Defined in: instructions.ts:564

Recover a wallet by rotating the owner key (guardian-initiated).

⚠️ CRITICAL SECURITY WARNING:
In v1, ANY SINGLE registered guardian can unilaterally rotate the owner.
This means a compromised guardian can steal the entire wallet.
See SECURITY.md for full details.

Accounts:
0. `[signer]`    Guardian (must be registered on the wallet)
1. `[writable]`  SmartWallet PDA

Data:
- `[0..32] new_owner: Pubkey` — the new owner public key

## Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`RecoverWalletParams`](Interface.RecoverWalletParams.md) |

## Returns

`TransactionInstruction`
