# Interface: SessionKey

Defined in: types.ts:65

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agent"></a> `agent` | `string` | Base58 address of the agent this session belongs to | types.ts:71 |
| <a id="property-amountspent"></a> `amountSpent` | `bigint` | Lamports spent so far in this session | types.ts:83 |
| <a id="property-bump"></a> `bump` | `number` | PDA bump seed | types.ts:75 |
| <a id="property-createdat"></a> `createdAt` | `bigint` | Unix timestamp when session was created | types.ts:77 |
| <a id="property-expiresat"></a> `expiresAt` | `bigint` | Unix timestamp when session expires | types.ts:79 |
| <a id="property-isrevoked"></a> `isRevoked` | `boolean` | Whether this session has been revoked | types.ts:87 |
| <a id="property-maxamount"></a> `maxAmount` | `bigint` | Maximum lamports this session can spend | types.ts:81 |
| <a id="property-maxpertx"></a> `maxPerTx` | `bigint` | Maximum lamports per transaction | types.ts:85 |
| <a id="property-nonce"></a> `nonce` | `bigint` | Replay protection nonce | types.ts:89 |
| <a id="property-sessionaddress"></a> `sessionAddress` | `string` | Base58 address of the SessionKey PDA | types.ts:67 |
| <a id="property-sessionpubkey"></a> `sessionPubkey` | `string` | Base58 address of the ephemeral session public key | types.ts:73 |
| <a id="property-wallet"></a> `wallet` | `string` | Base58 address of the parent SmartWallet | types.ts:69 |
