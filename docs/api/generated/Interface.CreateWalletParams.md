# Interface: CreateWalletParams

Defined in: instructions.ts:50

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-dailylimitlamports"></a> `dailyLimitLamports` | `bigint` | Maximum SOL that can be spent per day (in lamports) | instructions.ts:57 |
| <a id="property-funder"></a> `funder?` | `PublicKey` | Optional funder public key — pays rent + tx fees. When omitted, owner pays (self-funded mode). | instructions.ts:55 |
| <a id="property-owner"></a> `owner` | `PublicKey` | The owner's public key (will sign the transaction) | instructions.ts:52 |
| <a id="property-pertxlimitlamports"></a> `perTxLimitLamports` | `bigint` | Maximum SOL that can be spent per transaction (in lamports) | instructions.ts:59 |
| <a id="property-programid"></a> `programId?` | `PublicKey` | Program ID (defaults to SENTINEL_PROGRAM_ID) | instructions.ts:61 |
