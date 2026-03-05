# Interface: AgentConfig

Defined in: types.ts:34

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agent"></a> `agent` | `string` | Base58 address of the agent's public key | types.ts:40 |
| <a id="property-allowedinstructions"></a> `allowedInstructions` | `string`[] | Instruction discriminators this agent can invoke (hex strings) | types.ts:50 |
| <a id="property-allowedprograms"></a> `allowedPrograms` | `string`[] | Programs this agent is allowed to call via CPI | types.ts:48 |
| <a id="property-bump"></a> `bump` | `number` | PDA bump seed | types.ts:44 |
| <a id="property-configaddress"></a> `configAddress` | `string` | Base58 address of the AgentConfig PDA | types.ts:36 |
| <a id="property-dailylimit"></a> `dailyLimit` | `bigint` | Maximum lamports this agent can spend per day | types.ts:52 |
| <a id="property-defaultsessionduration"></a> `defaultSessionDuration` | `bigint` | Default session duration in seconds | types.ts:56 |
| <a id="property-isactive"></a> `isActive` | `boolean` | Whether this agent is currently active | types.ts:46 |
| <a id="property-maxsessionduration"></a> `maxSessionDuration` | `bigint` | Maximum session duration in seconds | types.ts:58 |
| <a id="property-name"></a> `name` | `string` | Human-readable name of the agent | types.ts:42 |
| <a id="property-pertxlimit"></a> `perTxLimit` | `bigint` | Maximum lamports this agent can spend per transaction | types.ts:54 |
| <a id="property-totalspent"></a> `totalSpent` | `bigint` | Total lamports spent by this agent (lifetime) | types.ts:60 |
| <a id="property-txcount"></a> `txCount` | `bigint` | Total transactions executed by this agent | types.ts:62 |
| <a id="property-wallet"></a> `wallet` | `string` | Base58 address of the parent SmartWallet | types.ts:38 |
