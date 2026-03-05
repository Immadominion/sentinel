# Interface: RecoverWalletParams

Defined in: instructions.ts:538

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-guardian"></a> `guardian` | `PublicKey` | The guardian's public key (must sign - must be registered guardian) | instructions.ts:540 |
| <a id="property-newowner"></a> `newOwner` | `PublicKey` | The new owner's public key | instructions.ts:544 |
| <a id="property-programid"></a> `programId?` | `PublicKey` | Program ID (defaults to SENTINEL_PROGRAM_ID) | instructions.ts:546 |
| <a id="property-walletowner"></a> `walletOwner` | `PublicKey` | The wallet owner's public key (to derive wallet PDA) | instructions.ts:542 |
