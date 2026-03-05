use pinocchio::error::ProgramError;

/// Custom errors for the Sentinel Wallet program.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u32)]
pub enum SentinelError {
    // General errors (0-99)
    InvalidInstruction = 0,
    InvalidAccountData = 1,
    AccountNotWritable = 2,
    AccountNotSigner = 3,
    InvalidProgramId = 4,
    AccountAlreadyInitialized = 5,
    AccountNotInitialized = 6,
    InsufficientFunds = 7,

    // Wallet errors (100-199)
    WalletAlreadyExists = 100,
    WalletNotFound = 101,
    InvalidWalletOwner = 102,
    WalletClosed = 103,

    // Agent errors (200-299)
    AgentAlreadyRegistered = 200,
    AgentNotFound = 201,
    AgentNotActive = 202,
    MaxAgentsReached = 203,
    AgentNotAuthorized = 204,

    // Session key errors (300-399)
    SessionExpired = 300,
    SessionRevoked = 301,
    SessionScopeViolation = 302,
    SpendingLimitExceeded = 303,
    PerTransactionLimitExceeded = 304,
    DailyLimitExceeded = 305,
    InvalidSessionKey = 306,
    MaxSessionsReached = 307,

    // Guardian errors (400-499)
    GuardianAlreadyAdded = 400,
    GuardianNotFound = 401,
    InsufficientGuardianApprovals = 402,
    MaxGuardiansReached = 403,

    // CPI errors (500-599)
    ProgramNotAllowed = 500,
    InstructionNotAllowed = 501,
    CpiExecutionFailed = 502,

    // Nonce errors (600-699)
    InvalidNonce = 600,
    NonceAlreadyUsed = 601,

    // Serialization errors (700-799)
    SerializationError = 700,
    DeserializationError = 701,
    InvalidDataLength = 702,
}

impl From<SentinelError> for ProgramError {
    fn from(e: SentinelError) -> Self {
        ProgramError::Custom(e as u32)
    }
}
