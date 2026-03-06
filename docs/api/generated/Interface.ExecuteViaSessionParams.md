# Interface: ExecuteViaSessionParams

Defined in: instructions.ts:298

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agent"></a> `agent` | `PublicKey` | The agent's public key | instructions.ts:304 |
| <a id="property-amountlamports"></a> `amountLamports` | `bigint` | Amount for spending limit tracking (in lamports) - critical for enforcing limits | instructions.ts:310 |
| <a id="property-innerinstructiondata"></a> `innerInstructionData` | `Buffer` | The instruction data to send to the target program | instructions.ts:312 |
| <a id="property-programid"></a> `programId?` | `PublicKey` | Program ID (defaults to SEAL_PROGRAM_ID) | instructions.ts:323 |
| <a id="property-remainingaccounts"></a> `remainingAccounts` | \{ `isSigner`: `boolean`; `isWritable`: `boolean`; `pubkey`: `PublicKey`; \}[] | Additional accounts to pass through to the CPI. The wallet PDA will automatically be added as a signer. | instructions.ts:317 |
| <a id="property-sessionkey"></a> `sessionKey` | `PublicKey` | The session key (ephemeral keypair that signs the transaction) | instructions.ts:300 |
| <a id="property-sessionpubkey"></a> `sessionPubkey` | `PublicKey` | The session's ephemeral public key | instructions.ts:306 |
| <a id="property-targetprogram"></a> `targetProgram` | `PublicKey` | The target program to CPI into | instructions.ts:308 |
| <a id="property-walletowner"></a> `walletOwner` | `PublicKey` | The wallet owner's public key (to derive wallet PDA) | instructions.ts:302 |
