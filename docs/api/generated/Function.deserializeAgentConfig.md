# Function: deserializeAgentConfig()

```ts
function deserializeAgentConfig(address, data): AgentConfig | null;
```

Defined in: accounts.ts:136

Deserialize an AgentConfig account from raw bytes.

Layout (540 bytes total - verified from Rust):
- [0..8]     discriminator "SentAgnt" (8)
- [8..40]    wallet: Pubkey (32)
- [40..72]   agent: Pubkey (32)
- [72..104]  name: [u8; 32] (32)
- [104]      bump: u8 (1)
- [105]      is_active: bool (1)
- [106]      allowed_programs_count: u8 (1)
- [107..363] allowed_programs: [Pubkey; 8] (256 = 8*32)
- [363]      allowed_instructions_count: u8 (1)
- [364..492] allowed_instructions: [[u8; 8]; 16] (128 = 16*8)
- [492..500] daily_limit: u64 (8)
- [500..508] per_tx_limit: u64 (8)
- [508..516] default_session_duration: i64 (8)
- [516..524] max_session_duration: i64 (8)
- [524..532] total_spent: u64 (8)
- [532..540] tx_count: u64 (8)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `address` | `PublicKey` |
| `data` | `Buffer` |

## Returns

[`AgentConfig`](Interface.AgentConfig.md) \| `null`
