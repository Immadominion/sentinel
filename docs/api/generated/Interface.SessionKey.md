# Interface: SessionKey

Defined in: [types.ts:73](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L73)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agent"></a> `agent` | `string` | Base58 address of the agent this session belongs to | [types.ts:79](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L79) |
| <a id="property-amountspent"></a> `amountSpent` | `bigint` | Lamports spent so far in this session | [types.ts:91](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L91) |
| <a id="property-bump"></a> `bump` | `number` | PDA bump seed | [types.ts:83](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L83) |
| <a id="property-createdat"></a> `createdAt` | `bigint` | Unix timestamp when session was created | [types.ts:85](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L85) |
| <a id="property-expiresat"></a> `expiresAt` | `bigint` | Unix timestamp when session expires | [types.ts:87](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L87) |
| <a id="property-isrevoked"></a> `isRevoked` | `boolean` | Whether this session has been revoked | [types.ts:95](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L95) |
| <a id="property-maxamount"></a> `maxAmount` | `bigint` | Maximum lamports this session can spend | [types.ts:89](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L89) |
| <a id="property-maxpertx"></a> `maxPerTx` | `bigint` | Maximum lamports per transaction | [types.ts:93](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L93) |
| <a id="property-nonce"></a> `nonce` | `bigint` | Replay protection nonce | [types.ts:97](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L97) |
| <a id="property-sessionaddress"></a> `sessionAddress` | `string` | Base58 address of the SessionKey PDA | [types.ts:75](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L75) |
| <a id="property-sessionpubkey"></a> `sessionPubkey` | `string` | Base58 address of the ephemeral session public key | [types.ts:81](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L81) |
| <a id="property-wallet"></a> `wallet` | `string` | Base58 address of the parent SmartWallet | [types.ts:77](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L77) |
