# Interface: RevokeSessionParams

Defined in: instructions.ts:248

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agent"></a> `agent` | `PublicKey` | The agent's public key | instructions.ts:254 |
| <a id="property-authority"></a> `authority` | `PublicKey` | The signer (owner or agent can revoke) | instructions.ts:250 |
| <a id="property-programid"></a> `programId?` | `PublicKey` | Program ID (defaults to SEAL_PROGRAM_ID) | instructions.ts:258 |
| <a id="property-sessionpubkey"></a> `sessionPubkey` | `PublicKey` | The session's ephemeral public key | instructions.ts:256 |
| <a id="property-walletowner"></a> `walletOwner` | `PublicKey` | The wallet owner's public key (to derive wallet PDA) | instructions.ts:252 |
