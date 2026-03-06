#[cfg(test)]
mod tests {
    use borsh::{BorshDeserialize, BorshSerialize};
    use solana_sdk::pubkey::Pubkey;

    use crate::state::{
        smart_wallet::SmartWallet,
        session_key::SessionKey,
        agent_config::AgentConfig,
        SMART_WALLET_DISCRIMINATOR, SESSION_KEY_DISCRIMINATOR, AGENT_CONFIG_DISCRIMINATOR,
        WALLET_SEED, SESSION_SEED, AGENT_SEED,
        MAX_GUARDIANS, MAX_AGENTS, MAX_ALLOWED_PROGRAMS, MAX_ALLOWED_INSTRUCTIONS,
    };

    // ----------------------------------------------------------------
    // Helper: Dummy program ID for PDA derivation
    // ----------------------------------------------------------------

    fn program_id() -> Pubkey {
        Pubkey::new_from_array([
            0x53, 0x65, 0x6E, 0x74, 0x57, 0x61, 0x4C, 0x31,
            0x65, 0x74, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
        ])
    }

    // ================================================================
    // SmartWallet Tests
    // ================================================================

    #[test]
    fn smart_wallet_new_sets_discriminator_and_defaults() {
        let owner = [1u8; 32];
        let wallet = SmartWallet::new(owner, 254, 1_000_000_000, 100_000_000);

        assert_eq!(wallet.discriminator, SMART_WALLET_DISCRIMINATOR);
        assert_eq!(wallet.owner, owner);
        assert_eq!(wallet.pda_authority, owner); // pda_authority == owner at creation
        assert_eq!(wallet.recovery_threshold, 1);
        assert_eq!(wallet.bump, 254);
        assert_eq!(wallet.nonce, 0);
        assert_eq!(wallet.agent_count, 0);
        assert_eq!(wallet.guardian_count, 0);
        assert_eq!(wallet.guardians, [[0u8; 32]; MAX_GUARDIANS]);
        assert_eq!(wallet.daily_limit_lamports, 1_000_000_000);
        assert_eq!(wallet.per_tx_limit_lamports, 100_000_000);
        assert_eq!(wallet.spent_today_lamports, 0);
        assert_eq!(wallet.day_start_timestamp, 0);
        assert!(!wallet.is_locked);
        assert!(!wallet.is_closed);
    }

    #[test]
    fn smart_wallet_serialize_deserialize_roundtrip() {
        let owner = [42u8; 32];
        let mut wallet = SmartWallet::new(owner, 253, 5_000_000_000, 500_000_000);
        wallet.nonce = 7;
        wallet.agent_count = 3;
        wallet.guardian_count = 2;
        wallet.guardians[0] = [10u8; 32];
        wallet.guardians[1] = [20u8; 32];
        wallet.spent_today_lamports = 123_456;
        wallet.day_start_timestamp = 1_700_000_000;
        wallet.is_locked = true;

        let bytes = borsh::to_vec(&wallet).unwrap();
        let decoded = SmartWallet::try_from_slice(&bytes).unwrap();

        assert_eq!(decoded.discriminator, SMART_WALLET_DISCRIMINATOR);
        assert_eq!(decoded.owner, owner);
        assert_eq!(decoded.pda_authority, owner); // immutable, always matches initial owner
        assert_eq!(decoded.recovery_threshold, 1);
        assert_eq!(decoded.bump, 253);
        assert_eq!(decoded.nonce, 7);
        assert_eq!(decoded.agent_count, 3);
        assert_eq!(decoded.guardian_count, 2);
        assert_eq!(decoded.guardians[0], [10u8; 32]);
        assert_eq!(decoded.guardians[1], [20u8; 32]);
        assert_eq!(decoded.spent_today_lamports, 123_456);
        assert_eq!(decoded.day_start_timestamp, 1_700_000_000);
        assert!(decoded.is_locked);
        assert!(!decoded.is_closed);
    }

    #[test]
    fn smart_wallet_size_matches_serialized_length() {
        let wallet = SmartWallet::new([0u8; 32], 255, 1, 1);
        let bytes = borsh::to_vec(&wallet).unwrap();
        assert_eq!(bytes.len(), SmartWallet::SIZE);
    }

    // ================================================================
    // SessionKey Tests
    // ================================================================

    fn make_session_key() -> SessionKey {
        SessionKey {
            discriminator: SESSION_KEY_DISCRIMINATOR,
            wallet: [1u8; 32],
            agent: [2u8; 32],
            session_pubkey: [3u8; 32],
            bump: 252,
            created_at: 1_700_000_000,
            expires_at: 1_700_003_600, // +1 hour
            max_amount: 10_000_000_000,
            amount_spent: 0,
            max_per_tx: 1_000_000_000,
            is_revoked: false,
            nonce: 0,
        }
    }

    #[test]
    fn session_key_serialize_deserialize_roundtrip() {
        let session = make_session_key();
        let bytes = borsh::to_vec(&session).unwrap();
        let decoded = SessionKey::try_from_slice(&bytes).unwrap();

        assert_eq!(decoded.discriminator, SESSION_KEY_DISCRIMINATOR);
        assert_eq!(decoded.wallet, [1u8; 32]);
        assert_eq!(decoded.agent, [2u8; 32]);
        assert_eq!(decoded.session_pubkey, [3u8; 32]);
        assert_eq!(decoded.bump, 252);
        assert_eq!(decoded.created_at, 1_700_000_000);
        assert_eq!(decoded.expires_at, 1_700_003_600);
        assert_eq!(decoded.max_amount, 10_000_000_000);
        assert_eq!(decoded.amount_spent, 0);
        assert_eq!(decoded.max_per_tx, 1_000_000_000);
        assert!(!decoded.is_revoked);
        assert_eq!(decoded.nonce, 0);
    }

    #[test]
    fn session_key_size_matches_serialized_length() {
        let session = make_session_key();
        let bytes = borsh::to_vec(&session).unwrap();
        assert_eq!(bytes.len(), SessionKey::SIZE);
    }

    #[test]
    fn session_key_is_valid_active_session() {
        let session = make_session_key();
        // Current time is within session window
        assert!(session.is_valid(1_700_001_000));
    }

    #[test]
    fn session_key_is_valid_expired() {
        let session = make_session_key();
        // Current time is past expiry
        assert!(!session.is_valid(1_700_004_000));
    }

    #[test]
    fn session_key_is_valid_exactly_at_expiry() {
        let session = make_session_key();
        // Exactly at expiry — should be invalid (expires_at is exclusive)
        assert!(!session.is_valid(1_700_003_600));
    }

    #[test]
    fn session_key_is_valid_revoked() {
        let mut session = make_session_key();
        session.is_revoked = true;
        assert!(!session.is_valid(1_700_001_000));
    }

    #[test]
    fn session_key_is_valid_fully_spent() {
        let mut session = make_session_key();
        session.amount_spent = session.max_amount; // equal → invalid
        assert!(!session.is_valid(1_700_001_000));
    }

    #[test]
    fn session_key_can_spend_within_limits() {
        let session = make_session_key();
        // Under per-tx and total limits
        assert!(session.can_spend(500_000_000));
    }

    #[test]
    fn session_key_can_spend_exact_per_tx_limit() {
        let session = make_session_key();
        assert!(session.can_spend(1_000_000_000));
    }

    #[test]
    fn session_key_cannot_spend_over_per_tx_limit() {
        let session = make_session_key();
        assert!(!session.can_spend(1_000_000_001));
    }

    #[test]
    fn session_key_cannot_spend_over_total_limit() {
        let mut session = make_session_key();
        session.amount_spent = 9_500_000_000;
        // Remaining = 500M, trying to spend 600M
        assert!(!session.can_spend(600_000_000));
    }

    #[test]
    fn session_key_can_spend_zero() {
        let session = make_session_key();
        assert!(session.can_spend(0));
    }

    #[test]
    fn session_key_can_spend_overflow_protection() {
        let mut session = make_session_key();
        session.amount_spent = u64::MAX - 1;
        session.max_amount = u64::MAX;
        session.max_per_tx = u64::MAX;
        // This addition would overflow
        assert!(!session.can_spend(u64::MAX));
    }

    // ================================================================
    // AgentConfig Tests
    // ================================================================

    fn make_agent_config() -> AgentConfig {
        AgentConfig {
            discriminator: AGENT_CONFIG_DISCRIMINATOR,
            wallet: [1u8; 32],
            agent: [2u8; 32],
            name: *b"TestAgent\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0",
            bump: 251,
            is_active: true,
            allowed_programs_count: 2,
            allowed_programs: {
                let mut arr = [[0u8; 32]; MAX_ALLOWED_PROGRAMS];
                arr[0] = [10u8; 32];
                arr[1] = [20u8; 32];
                arr
            },
            allowed_instructions_count: 1,
            allowed_instructions: {
                let mut arr = [[0u8; 8]; MAX_ALLOWED_INSTRUCTIONS];
                arr[0] = [0xAA, 0xBB, 0xCC, 0xDD, 0x00, 0x00, 0x00, 0x00];
                arr
            },
            daily_limit: 5_000_000_000,
            per_tx_limit: 1_000_000_000,
            default_session_duration: 3600,
            max_session_duration: 86400,
            total_spent: 100_000,
            tx_count: 5,
            spent_today: 0,
            day_start_timestamp: 0,
        }
    }

    #[test]
    fn agent_config_serialize_deserialize_roundtrip() {
        let agent = make_agent_config();
        let bytes = borsh::to_vec(&agent).unwrap();
        let decoded = AgentConfig::try_from_slice(&bytes).unwrap();

        assert_eq!(decoded.discriminator, AGENT_CONFIG_DISCRIMINATOR);
        assert_eq!(decoded.wallet, [1u8; 32]);
        assert_eq!(decoded.agent, [2u8; 32]);
        assert_eq!(decoded.bump, 251);
        assert!(decoded.is_active);
        assert_eq!(decoded.allowed_programs_count, 2);
        assert_eq!(decoded.allowed_programs[0], [10u8; 32]);
        assert_eq!(decoded.allowed_programs[1], [20u8; 32]);
        assert_eq!(decoded.allowed_instructions_count, 1);
        assert_eq!(decoded.daily_limit, 5_000_000_000);
        assert_eq!(decoded.per_tx_limit, 1_000_000_000);
        assert_eq!(decoded.default_session_duration, 3600);
        assert_eq!(decoded.max_session_duration, 86400);
        assert_eq!(decoded.total_spent, 100_000);
        assert_eq!(decoded.tx_count, 5);
    }

    #[test]
    fn agent_config_size_matches_serialized_length() {
        let agent = make_agent_config();
        let bytes = borsh::to_vec(&agent).unwrap();
        assert_eq!(bytes.len(), AgentConfig::SIZE);
    }

    #[test]
    fn agent_config_is_program_allowed_found() {
        let agent = make_agent_config();
        assert!(agent.is_program_allowed(&[10u8; 32]));
        assert!(agent.is_program_allowed(&[20u8; 32]));
    }

    #[test]
    fn agent_config_is_program_allowed_not_found() {
        let agent = make_agent_config();
        assert!(!agent.is_program_allowed(&[99u8; 32]));
    }

    #[test]
    fn agent_config_is_program_allowed_ignores_zero_slots() {
        let agent = make_agent_config();
        // Slot 2+ are zeroed, should not match the zero pubkey
        // (unless zero pubkey is explicitly in the list)
        assert!(!agent.is_program_allowed(&[0u8; 32]));
    }

    #[test]
    fn agent_config_is_program_allowed_zero_count_denies_all() {
        let mut agent = make_agent_config();
        agent.allowed_programs_count = 0;
        // count=0 means default-closed: no programs = no access
        assert!(!agent.is_program_allowed(&[99u8; 32]));
        assert!(!agent.is_program_allowed(&[0u8; 32]));
    }

    #[test]
    fn agent_config_is_instruction_allowed_found() {
        let agent = make_agent_config();
        assert!(agent.is_instruction_allowed(&[0xAA, 0xBB, 0xCC, 0xDD, 0x00, 0x00, 0x00, 0x00]));
    }

    #[test]
    fn agent_config_is_instruction_allowed_not_found() {
        let agent = make_agent_config();
        assert!(!agent.is_instruction_allowed(&[0xFF; 8]));
    }

    #[test]
    fn agent_config_is_instruction_allowed_zero_count_allows_all() {
        let mut agent = make_agent_config();
        agent.allowed_instructions_count = 0;
        // Default-open: no instruction restrictions = all instructions allowed
        assert!(agent.is_instruction_allowed(&[0xFF; 8]));
        assert!(agent.is_instruction_allowed(&[0x00; 8]));
    }

    // ================================================================
    // Discriminator Tests
    // ================================================================

    #[test]
    fn discriminator_constants_are_unique() {
        assert_ne!(SMART_WALLET_DISCRIMINATOR, SESSION_KEY_DISCRIMINATOR);
        assert_ne!(SMART_WALLET_DISCRIMINATOR, AGENT_CONFIG_DISCRIMINATOR);
        assert_ne!(SESSION_KEY_DISCRIMINATOR, AGENT_CONFIG_DISCRIMINATOR);
    }

    #[test]
    fn discriminator_values_are_expected_ascii() {
        // "SealWalt"
        assert_eq!(&SMART_WALLET_DISCRIMINATOR, b"SealWalt");
        // "SealSess"
        assert_eq!(&SESSION_KEY_DISCRIMINATOR, b"SealSess");
        // "SealAgnt"
        assert_eq!(&AGENT_CONFIG_DISCRIMINATOR, b"SealAgnt");
    }

    // ================================================================
    // PDA Derivation Tests
    // ================================================================

    #[test]
    fn wallet_pda_derivation_is_deterministic() {
        let pid = program_id();
        let owner = Pubkey::new_unique();

        let (pda1, bump1) =
            Pubkey::find_program_address(&[WALLET_SEED, owner.as_ref()], &pid);
        let (pda2, bump2) =
            Pubkey::find_program_address(&[WALLET_SEED, owner.as_ref()], &pid);

        assert_eq!(pda1, pda2);
        assert_eq!(bump1, bump2);
    }

    #[test]
    fn wallet_pda_different_owners_different_pdas() {
        let pid = program_id();
        let owner_a = Pubkey::new_unique();
        let owner_b = Pubkey::new_unique();

        let (pda_a, _) =
            Pubkey::find_program_address(&[WALLET_SEED, owner_a.as_ref()], &pid);
        let (pda_b, _) =
            Pubkey::find_program_address(&[WALLET_SEED, owner_b.as_ref()], &pid);

        assert_ne!(pda_a, pda_b);
    }

    #[test]
    fn session_pda_derivation_is_deterministic() {
        let pid = program_id();
        let wallet = Pubkey::new_unique();
        let agent = Pubkey::new_unique();
        let session_pk = Pubkey::new_unique();

        let (pda1, bump1) = Pubkey::find_program_address(
            &[SESSION_SEED, wallet.as_ref(), agent.as_ref(), session_pk.as_ref()],
            &pid,
        );
        let (pda2, bump2) = Pubkey::find_program_address(
            &[SESSION_SEED, wallet.as_ref(), agent.as_ref(), session_pk.as_ref()],
            &pid,
        );

        assert_eq!(pda1, pda2);
        assert_eq!(bump1, bump2);
    }

    #[test]
    fn agent_pda_derivation_is_deterministic() {
        let pid = program_id();
        let wallet = Pubkey::new_unique();
        let agent = Pubkey::new_unique();

        let (pda1, bump1) = Pubkey::find_program_address(
            &[AGENT_SEED, wallet.as_ref(), agent.as_ref()],
            &pid,
        );
        let (pda2, bump2) = Pubkey::find_program_address(
            &[AGENT_SEED, wallet.as_ref(), agent.as_ref()],
            &pid,
        );

        assert_eq!(pda1, pda2);
        assert_eq!(bump1, bump2);
    }

    #[test]
    fn agent_pda_different_agents_different_pdas() {
        let pid = program_id();
        let wallet = Pubkey::new_unique();
        let agent_a = Pubkey::new_unique();
        let agent_b = Pubkey::new_unique();

        let (pda_a, _) = Pubkey::find_program_address(
            &[AGENT_SEED, wallet.as_ref(), agent_a.as_ref()],
            &pid,
        );
        let (pda_b, _) = Pubkey::find_program_address(
            &[AGENT_SEED, wallet.as_ref(), agent_b.as_ref()],
            &pid,
        );

        assert_ne!(pda_a, pda_b);
    }

    #[test]
    fn wallet_pda_bump_is_valid() {
        let pid = program_id();
        let owner = Pubkey::new_unique();
        let (pda, bump) =
            Pubkey::find_program_address(&[WALLET_SEED, owner.as_ref()], &pid);

        // Verify we can recreate the PDA with the bump
        let recreated = Pubkey::create_program_address(
            &[WALLET_SEED, owner.as_ref(), &[bump]],
            &pid,
        )
        .unwrap();
        assert_eq!(pda, recreated);
    }

    #[test]
    fn session_pda_bump_is_valid() {
        let pid = program_id();
        let wallet = Pubkey::new_unique();
        let agent = Pubkey::new_unique();
        let session_pk = Pubkey::new_unique();
        let (pda, bump) = Pubkey::find_program_address(
            &[SESSION_SEED, wallet.as_ref(), agent.as_ref(), session_pk.as_ref()],
            &pid,
        );

        let recreated = Pubkey::create_program_address(
            &[SESSION_SEED, wallet.as_ref(), agent.as_ref(), session_pk.as_ref(), &[bump]],
            &pid,
        )
        .unwrap();
        assert_eq!(pda, recreated);
    }

    // ================================================================
    // Constant Sanity Checks
    // ================================================================

    #[test]
    fn seeds_are_expected_values() {
        assert_eq!(WALLET_SEED, b"seal");
        assert_eq!(SESSION_SEED, b"session");
        assert_eq!(AGENT_SEED, b"agent");
    }

    #[test]
    fn limits_are_sane() {
        assert_eq!(MAX_GUARDIANS, 5);
        assert_eq!(MAX_AGENTS, 16);
        assert_eq!(MAX_ALLOWED_PROGRAMS, 8);
        assert_eq!(MAX_ALLOWED_INSTRUCTIONS, 16);
    }
}
