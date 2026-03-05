# Function: createSessionInstruction()

```ts
function createSessionInstruction(params): TransactionInstruction;
```

Defined in: instructions.ts:209

Create a new session key for an agent.

Accounts:
0. `[signer, writable]` Agent (payer)
1. `[]` SmartWallet PDA
2. `[]` AgentConfig PDA
3. `[writable]` SessionKey PDA
4. `[]` System Program

## Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`CreateSessionParams`](Interface.CreateSessionParams.md) |

## Returns

`TransactionInstruction`
