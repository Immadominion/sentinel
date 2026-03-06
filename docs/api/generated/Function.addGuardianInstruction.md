# Function: addGuardianInstruction()

```ts
function addGuardianInstruction(params): TransactionInstruction;
```

Defined in: [instructions.ts:472](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L472)

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
