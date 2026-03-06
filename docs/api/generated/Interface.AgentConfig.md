# Interface: AgentConfig

Defined in: [types.ts:38](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L38)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agent"></a> `agent` | `string` | Base58 address of the agent's public key | [types.ts:44](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L44) |
| <a id="property-allowedinstructions"></a> `allowedInstructions` | `string`[] | Instruction discriminators this agent can invoke (hex strings) | [types.ts:54](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L54) |
| <a id="property-allowedprograms"></a> `allowedPrograms` | `string`[] | Programs this agent is allowed to call via CPI | [types.ts:52](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L52) |
| <a id="property-bump"></a> `bump` | `number` | PDA bump seed | [types.ts:48](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L48) |
| <a id="property-configaddress"></a> `configAddress` | `string` | Base58 address of the AgentConfig PDA | [types.ts:40](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L40) |
| <a id="property-dailylimit"></a> `dailyLimit` | `bigint` | Maximum lamports this agent can spend per day | [types.ts:56](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L56) |
| <a id="property-daystarttimestamp"></a> `dayStartTimestamp` | `bigint` | Unix timestamp of the start of the current daily window | [types.ts:70](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L70) |
| <a id="property-defaultsessionduration"></a> `defaultSessionDuration` | `bigint` | Default session duration in seconds | [types.ts:60](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L60) |
| <a id="property-isactive"></a> `isActive` | `boolean` | Whether this agent is currently active | [types.ts:50](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L50) |
| <a id="property-maxsessionduration"></a> `maxSessionDuration` | `bigint` | Maximum session duration in seconds | [types.ts:62](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L62) |
| <a id="property-name"></a> `name` | `string` | Human-readable name of the agent | [types.ts:46](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L46) |
| <a id="property-pertxlimit"></a> `perTxLimit` | `bigint` | Maximum lamports this agent can spend per transaction | [types.ts:58](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L58) |
| <a id="property-spenttoday"></a> `spentToday` | `bigint` | Lamports spent by this agent today (rolling daily window) | [types.ts:68](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L68) |
| <a id="property-totalspent"></a> `totalSpent` | `bigint` | Total lamports spent by this agent (lifetime) | [types.ts:64](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L64) |
| <a id="property-txcount"></a> `txCount` | `bigint` | Total transactions executed by this agent | [types.ts:66](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L66) |
| <a id="property-wallet"></a> `wallet` | `string` | Base58 address of the parent SmartWallet | [types.ts:42](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/types.ts#L42) |
