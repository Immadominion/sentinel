# Function: deserializeSmartWallet()

```ts
function deserializeSmartWallet(address, data): SmartWallet | null;
```

Defined in: accounts.ts:61

Deserialize a SmartWallet account from raw bytes.

Layout (245 bytes total - verified from Rust):
- [0..8]    discriminator "SentWalt" (8)
- [8..40]   owner: Pubkey (32)
- [40]      bump: u8 (1)
- [41..49]  nonce: u64 (8)
- [49]      agent_count: u8 (1)
- [50]      guardian_count: u8 (1)
- [51..211] guardians: [Pubkey; 5] (160 = 5*32)
- [211..219] daily_limit_lamports: u64 (8)
- [219..227] per_tx_limit_lamports: u64 (8)
- [227..235] spent_today_lamports: u64 (8)
- [235..243] day_start_timestamp: i64 (8)
- [243]     is_locked: bool (1)
- [244]     is_closed: bool (1)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `address` | `PublicKey` |
| `data` | `Buffer` |

## Returns

[`SmartWallet`](Interface.SmartWallet.md) \| `null`
