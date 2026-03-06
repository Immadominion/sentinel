# Interface: RecoverWalletParams

Defined in: [instructions.ts:538](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L538)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-guardians"></a> `guardians` | `PublicKey`[] | Guardian public keys (must all sign - must each be registered) | [instructions.ts:540](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L540) |
| <a id="property-newowner"></a> `newOwner` | `PublicKey` | The new owner's public key | [instructions.ts:544](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L544) |
| <a id="property-programid"></a> `programId?` | `PublicKey` | Program ID (defaults to SEAL_PROGRAM_ID) | [instructions.ts:546](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L546) |
| <a id="property-walletowner"></a> `walletOwner` | `PublicKey` | The wallet owner's public key (to derive wallet PDA) | [instructions.ts:542](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/instructions.ts#L542) |
