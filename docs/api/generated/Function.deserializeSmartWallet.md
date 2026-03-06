# Function: deserializeSmartWallet()

```ts
function deserializeSmartWallet(address, data): SmartWallet | null;
```

Defined in: [accounts.ts:63](https://github.com/Immadominion/sentinel/blob/fd31494042e1512e4c8be3ae0572497b18170ae0/sdk/seal-ts/src/accounts.ts#L63)

Deserialize a SmartWallet account from raw bytes.

Layout (278 bytes total - verified from Rust):
- [0..8]    discriminator "SealWalt" (8)
- [8..40]   pda_authority: Pubkey (32) — immutable PDA derivation key
- [40..72]  owner: Pubkey (32) — rotatable master authority
- [72]      bump: u8 (1)
- [73..81]  nonce: u64 (8)
- [81]      agent_count: u8 (1)
- [82]      guardian_count: u8 (1)
- [83]      recovery_threshold: u8 (1)
- [84..244] guardians: [Pubkey; 5] (160 = 5*32)
- [244..252] daily_limit_lamports: u64 (8)
- [252..260] per_tx_limit_lamports: u64 (8)
- [260..268] spent_today_lamports: u64 (8)
- [268..276] day_start_timestamp: i64 (8)
- [276]     is_locked: bool (1)
- [277]     is_closed: bool (1)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `address` | `PublicKey` |
| `data` | `Buffer` |

## Returns

[`SmartWallet`](Interface.SmartWallet.md) \| `null`
