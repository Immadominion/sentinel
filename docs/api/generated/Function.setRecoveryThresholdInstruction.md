# Function: setRecoveryThresholdInstruction()

```ts
function setRecoveryThresholdInstruction(params): TransactionInstruction;
```

Defined in: [instructions.ts:747](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L747)

Set the m-of-n recovery threshold (owner-only).

Determines how many guardians must co-sign a RecoverWallet call.
Must be between 1 and the current guardian count.

Accounts:
0. `[signer]`    Owner
1. `[writable]`  SmartWallet PDA

Data:
- `[0] threshold: u8` — the new recovery threshold

## Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`SetRecoveryThresholdParams`](Interface.SetRecoveryThresholdParams.md) |

## Returns

`TransactionInstruction`
