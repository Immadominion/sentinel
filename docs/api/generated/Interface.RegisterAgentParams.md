# Interface: RegisterAgentParams

Defined in: instructions.ts:107

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agent"></a> `agent` | `PublicKey` | The agent's public key (identifies the agent) | instructions.ts:111 |
| <a id="property-allowedinstructions"></a> `allowedInstructions?` | `Buffer`\<`ArrayBufferLike`\>[] | Instruction discriminators the agent is allowed to invoke (8 bytes each) | instructions.ts:117 |
| <a id="property-allowedprograms"></a> `allowedPrograms?` | `PublicKey`[] | Programs the agent is allowed to call via CPI | instructions.ts:115 |
| <a id="property-dailylimitlamports"></a> `dailyLimitLamports` | `bigint` | Maximum SOL the agent can spend per day (in lamports) | instructions.ts:119 |
| <a id="property-defaultsessiondurationsecs"></a> `defaultSessionDurationSecs?` | `bigint` | Default session duration in seconds | instructions.ts:123 |
| <a id="property-maxsessiondurationsecs"></a> `maxSessionDurationSecs?` | `bigint` | Maximum session duration in seconds | instructions.ts:125 |
| <a id="property-name"></a> `name` | `string` | Human-readable name for the agent (max 32 chars) | instructions.ts:113 |
| <a id="property-owner"></a> `owner` | `PublicKey` | The owner's public key (must sign) | instructions.ts:109 |
| <a id="property-pertxlimitlamports"></a> `perTxLimitLamports` | `bigint` | Maximum SOL the agent can spend per transaction (in lamports) | instructions.ts:121 |
| <a id="property-programid"></a> `programId?` | `PublicKey` | Program ID (defaults to SEAL_PROGRAM_ID) | instructions.ts:127 |
