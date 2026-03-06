# Function: removeGuardianInstruction()

```ts
function removeGuardianInstruction(params): TransactionInstruction;
```

Defined in: [instructions.ts:700](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L700)

Remove a guardian from the wallet (owner-only).

After removal, the recovery_threshold is automatically clamped
to the remaining guardian count so recovery remains possible.

Accounts:
0. `[signer]`    Owner
1. `[writable]`  SmartWallet PDA

Data:
- `[0..32] guardian_pubkey: Pubkey` — the guardian to remove

## Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`RemoveGuardianParams`](Interface.RemoveGuardianParams.md) |

## Returns

`TransactionInstruction`
