# Interface: SealClientConfig

Defined in: [client.ts:51](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/client.ts#L51)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-commitment"></a> `commitment?` | `"processed"` \| `"confirmed"` \| `"finalized"` | Commitment level | [client.ts:59](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/client.ts#L59) |
| <a id="property-network"></a> `network?` | `"mainnet"` \| `"devnet"` \| `"localnet"` | Network (defaults to devnet) | [client.ts:55](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/client.ts#L55) |
| <a id="property-programid"></a> `programId?` | `PublicKey` | The Seal program ID | [client.ts:57](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/client.ts#L57) |
| <a id="property-rpcurl"></a> `rpcUrl?` | `string` | RPC endpoint URL | [client.ts:53](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/client.ts#L53) |
