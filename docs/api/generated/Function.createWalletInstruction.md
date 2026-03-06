# Function: createWalletInstruction()

```ts
function createWalletInstruction(params): TransactionInstruction;
```

Defined in: [instructions.ts:77](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L77)

Create a new SmartWallet PDA for the owner.

Supports sponsored wallet creation: when `funder` is provided,
the funder pays rent and the owner just signs to prove intent.
When `funder` is omitted, owner pays everything (self-funded).

Accounts:
0. `[signer, writable]` Funder (pays rent)
1. `[signer]` Owner (becomes wallet owner)
2. `[writable]` SmartWallet PDA
3. `[]` System Program

## Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`CreateWalletParams`](Interface.CreateWalletParams.md) |

## Returns

`TransactionInstruction`
