# Function: registerAgentInstruction()

```ts
function registerAgentInstruction(params): TransactionInstruction;
```

Defined in: instructions.ts:139

Register a new agent on the SmartWallet.

Accounts:
0. `[signer, writable]` Owner
1. `[writable]` SmartWallet PDA
2. `[writable]` AgentConfig PDA
3. `[]` System Program

## Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`RegisterAgentParams`](Interface.RegisterAgentParams.md) |

## Returns

`TransactionInstruction`
