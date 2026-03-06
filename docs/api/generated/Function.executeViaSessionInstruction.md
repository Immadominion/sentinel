# Function: executeViaSessionInstruction()

```ts
function executeViaSessionInstruction(params): TransactionInstruction;
```

Defined in: instructions.ts:365

Execute a transaction via session key on behalf of the smart wallet.

This is the CORE instruction for autonomous agent operations.
The session key signs, and the Seal program:
1. Validates session validity (time, spending limits, allowed programs)
2. Executes the inner CPI with wallet PDA as signer
3. Updates spending counters

Accounts:
0. `[signer]`    Session Key — the ephemeral key that signs
1. `[writable]`  SmartWallet PDA — spending state updates
2. `[writable]`  AgentConfig PDA — tx_count / total_spent updates
3. `[writable]`  SessionKey PDA — amount_spent updates
4. `[]`          Target Program — the program being CPI'd into
5..N `[varies]`  Remaining accounts — passed through to target CPI

Data:
- `[0..8]  amount_lamports: u64` (LE) — amount for limit tracking
- `[8..]   inner_instruction_data: &[u8]` — data for the target CPI

## Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`ExecuteViaSessionParams`](Interface.ExecuteViaSessionParams.md) |

## Returns

`TransactionInstruction`

## Example

```typescript
// Execute a SPL Token transfer via session
const ix = executeViaSessionInstruction({
  sessionKey: sessionKeypair.publicKey,
  walletOwner: owner.publicKey,
  agent: agentKeypair.publicKey,
  sessionPubkey: sessionKeypair.publicKey,
  targetProgram: TOKEN_PROGRAM_ID,
  amountLamports: transferAmount,
  innerInstructionData: transferIxData,
  remainingAccounts: [
    { pubkey: walletPda, isSigner: false, isWritable: true },
    { pubkey: destination, isSigner: false, isWritable: true },
  ],
});
```
