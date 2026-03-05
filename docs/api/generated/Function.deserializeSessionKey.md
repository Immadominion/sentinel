# Function: deserializeSessionKey()

```ts
function deserializeSessionKey(address, data): SessionKey | null;
```

Defined in: accounts.ts:217

Deserialize a SessionKey account from raw bytes.

Layout (154 bytes total - verified from Rust):
- [0..8]     discriminator "SentSess" (8)
- [8..40]    wallet: Pubkey (32)
- [40..72]   agent: Pubkey (32)
- [72..104]  session_pubkey: Pubkey (32)
- [104]      bump: u8 (1)
- [105..113] created_at: i64 (8)
- [113..121] expires_at: i64 (8)
- [121..129] max_amount: u64 (8)
- [129..137] amount_spent: u64 (8)
- [137..145] max_per_tx: u64 (8)
- [145]      is_revoked: bool (1)
- [146..154] nonce: u64 (8)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `address` | `PublicKey` |
| `data` | `Buffer` |

## Returns

[`SessionKey`](Interface.SessionKey.md) \| `null`
