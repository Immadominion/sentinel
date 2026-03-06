# Interface: CreateSessionParams

Defined in: [instructions.ts:182](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L182)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agent"></a> `agent` | `PublicKey` | The agent's public key (must sign) | [instructions.ts:184](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L184) |
| <a id="property-durationsecs"></a> `durationSecs` | `bigint` | Session duration in seconds | [instructions.ts:190](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L190) |
| <a id="property-maxamountlamports"></a> `maxAmountLamports` | `bigint` | Maximum total amount for this session (in lamports) | [instructions.ts:192](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L192) |
| <a id="property-maxpertxlamports"></a> `maxPerTxLamports` | `bigint` | Maximum amount per transaction (in lamports) | [instructions.ts:194](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L194) |
| <a id="property-programid"></a> `programId?` | `PublicKey` | Program ID (defaults to SEAL_PROGRAM_ID) | [instructions.ts:196](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L196) |
| <a id="property-sessionpubkey"></a> `sessionPubkey` | `PublicKey` | Ephemeral keypair for this session (public key) | [instructions.ts:188](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L188) |
| <a id="property-walletowner"></a> `walletOwner` | `PublicKey` | The wallet owner's public key (to derive wallet PDA) | [instructions.ts:186](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L186) |
