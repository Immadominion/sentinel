/// Types for Sign-In With Solana (SIWS) authentication.
///
/// These are backend-agnostic — any server that understands SIWS message
/// format and Ed25519 signatures can work with this SDK.
library;

import 'dart:typed_data';

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

/// Configuration for a SIWS sign-in flow.
///
/// Matches the [Sign-In With Solana](https://github.com/phantom/sign-in-with-solana)
/// message format fields.
class SiwsConfig {
  /// The domain requesting the sign-in (e.g. `sage.app`).
  final String domain;

  /// Human-readable statement shown in the wallet.
  final String statement;

  /// Full URI of the requesting application.
  final String uri;

  /// SIWS spec version (always `1`).
  final int version;

  /// Solana chain identifier (`mainnet`, `devnet`, `testnet`).
  final String chainId;

  /// Display name for the dapp (shown in wallet's MWA prompt).
  final String appName;

  /// Relative path to a dapp icon (shown in wallet's MWA prompt).
  final String appIconPath;

  /// Solana cluster string for MWA authorize (e.g. `mainnet-beta`, `devnet`).
  ///
  /// This is the MWA protocol value, NOT the SIWS chain ID.
  final String cluster;

  const SiwsConfig({
    required this.domain,
    required this.statement,
    required this.uri,
    this.version = 1,
    this.chainId = 'mainnet',
    this.appName = 'App',
    this.appIconPath = 'favicon.ico',
    this.cluster = 'mainnet-beta',
  });

  /// Sage default configuration (mainnet).
  static const sage = SiwsConfig(
    domain: 'sage.app',
    statement: 'Sign in to Sage — your autonomous LP trading agent.',
    uri: 'https://sage.app',
    chainId: 'mainnet',
    appName: 'Sage',
    appIconPath: 'favicon.ico',
    cluster: 'mainnet-beta',
  );

  /// Sage devnet configuration (for development / testing).
  static const sageDev = SiwsConfig(
    domain: 'sage.app',
    statement: 'Sign in to Sage — your autonomous LP trading agent.',
    uri: 'https://sage.app',
    chainId: 'devnet',
    appName: 'Sage',
    appIconPath: 'favicon.ico',
    cluster: 'devnet',
  );
}

// ═══════════════════════════════════════════════════════════════
// Request / Response types
// ═══════════════════════════════════════════════════════════════

/// Payload sent to the backend for signature verification.
///
/// Contains everything the server needs to verify the SIWS
/// sign-in attempt: the wallet address (public key), the
/// Ed25519 signature, and the exact message that was signed.
class SiwsVerifyPayload {
  /// Wallet address (base58-encoded Solana public key).
  final String walletAddress;

  /// Ed25519 signature over [message] (raw bytes).
  final Uint8List signatureBytes;

  /// The SIWS message that was signed (plaintext).
  final String message;

  /// The server-generated nonce embedded in [message].
  final String nonce;

  const SiwsVerifyPayload({
    required this.walletAddress,
    required this.signatureBytes,
    required this.message,
    required this.nonce,
  });
}

/// Result of a successful SIWS sign-in.
///
/// Generic — the [serverData] field carries whatever your backend
/// returns (JWT tokens, user object, session info, etc.).
class SiwsResult<T> {
  /// Wallet address that signed in (base58).
  final String walletAddress;

  /// MWA auth token (for future reauthorize calls).
  final String mwaAuthToken;

  /// Optional wallet label (e.g. "My Phantom Wallet").
  final String? walletName;

  /// Backend response data (e.g. JWT tokens, user info).
  final T serverData;

  const SiwsResult({
    required this.walletAddress,
    required this.mwaAuthToken,
    this.walletName,
    required this.serverData,
  });
}

// ═══════════════════════════════════════════════════════════════
// Exceptions
// ═══════════════════════════════════════════════════════════════

/// Thrown when SIWS authentication fails.
class SiwsException implements Exception {
  final String message;
  final SiwsFailureReason reason;

  const SiwsException(this.message, {this.reason = SiwsFailureReason.unknown});

  @override
  String toString() => 'SiwsException($reason): $message';
}

/// Categorized failure reasons for error handling.
enum SiwsFailureReason {
  /// MWA not available (e.g. not Android, no wallet installed).
  mwaUnavailable,

  /// User cancelled wallet authorization.
  userCancelled,

  /// Wallet didn't return a signature.
  signingFailed,

  /// Network error when fetching nonce or verifying.
  networkError,

  /// Backend rejected the signature.
  verificationFailed,

  /// Something else went wrong.
  unknown,
}
