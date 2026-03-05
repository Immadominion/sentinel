# Interface: SmartWallet

Defined in: types.ts:5

On-chain account types (mirrors Rust state structs).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-address"></a> `address` | `string` | Base58 address of the SmartWallet PDA | types.ts:7 |
| <a id="property-agentcount"></a> `agentCount` | `number` | Number of registered agents | types.ts:15 |
| <a id="property-bump"></a> `bump` | `number` | PDA bump seed | types.ts:11 |
| <a id="property-dailylimitlamports"></a> `dailyLimitLamports` | `bigint` | Maximum lamports that can be spent per day | types.ts:21 |
| <a id="property-daystarttimestamp"></a> `dayStartTimestamp` | `bigint` | Unix timestamp when the current day started | types.ts:27 |
| <a id="property-guardiancount"></a> `guardianCount` | `number` | Number of guardians | types.ts:17 |
| <a id="property-guardians"></a> `guardians` | `string`[] | Guardian public keys (for recovery) | types.ts:19 |
| <a id="property-isclosed"></a> `isClosed` | `boolean` | Whether the wallet is closed | types.ts:31 |
| <a id="property-islocked"></a> `isLocked` | `boolean` | Whether the wallet is locked (no operations allowed) | types.ts:29 |
| <a id="property-nonce"></a> `nonce` | `bigint` | Replay protection nonce | types.ts:13 |
| <a id="property-owner"></a> `owner` | `string` | Base58 address of the owner (has full control) | types.ts:9 |
| <a id="property-pertxlimitlamports"></a> `perTxLimitLamports` | `bigint` | Maximum lamports that can be spent per transaction | types.ts:23 |
| <a id="property-spenttodaylamports"></a> `spentTodayLamports` | `bigint` | Lamports spent so far today | types.ts:25 |
