# Interface: SmartWallet

Defined in: [types.ts:5](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L5)

On-chain account types (mirrors Rust state structs).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-address"></a> `address` | `string` | Base58 address of the SmartWallet PDA | [types.ts:7](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L7) |
| <a id="property-agentcount"></a> `agentCount` | `number` | Number of registered agents | [types.ts:17](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L17) |
| <a id="property-bump"></a> `bump` | `number` | PDA bump seed | [types.ts:13](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L13) |
| <a id="property-dailylimitlamports"></a> `dailyLimitLamports` | `bigint` | Maximum lamports that can be spent per day | [types.ts:25](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L25) |
| <a id="property-daystarttimestamp"></a> `dayStartTimestamp` | `bigint` | Unix timestamp when the current day started | [types.ts:31](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L31) |
| <a id="property-guardiancount"></a> `guardianCount` | `number` | Number of guardians | [types.ts:19](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L19) |
| <a id="property-guardians"></a> `guardians` | `string`[] | Guardian public keys (for recovery) | [types.ts:23](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L23) |
| <a id="property-isclosed"></a> `isClosed` | `boolean` | Whether the wallet is closed | [types.ts:35](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L35) |
| <a id="property-islocked"></a> `isLocked` | `boolean` | Whether the wallet is locked (no operations allowed) | [types.ts:33](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L33) |
| <a id="property-nonce"></a> `nonce` | `bigint` | Replay protection nonce | [types.ts:15](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L15) |
| <a id="property-owner"></a> `owner` | `string` | Base58 address of the owner (has full control, rotatable via recovery) | [types.ts:11](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L11) |
| <a id="property-pdaauthority"></a> `pdaAuthority` | `string` | Base58 address of the immutable PDA authority (original owner, used for PDA derivation) | [types.ts:9](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L9) |
| <a id="property-pertxlimitlamports"></a> `perTxLimitLamports` | `bigint` | Maximum lamports that can be spent per transaction | [types.ts:27](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L27) |
| <a id="property-recoverythreshold"></a> `recoveryThreshold` | `number` | Minimum guardians required for recovery (m-of-n) | [types.ts:21](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L21) |
| <a id="property-spenttodaylamports"></a> `spentTodayLamports` | `bigint` | Lamports spent so far today | [types.ts:29](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L29) |
