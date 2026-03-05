# Function: deregisterAgentInstruction()

```ts
function deregisterAgentInstruction(params): TransactionInstruction;
```

Defined in: instructions.ts:514

Deregister an agent from the SmartWallet (returns rent).

Accounts:
0. `[signer, writable]` Owner (receives rent back)
1. `[writable]` SmartWallet PDA
2. `[writable]` AgentConfig PDA (will be closed)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`DeregisterAgentParams`](Interface.DeregisterAgentParams.md) |

## Returns

`TransactionInstruction`
