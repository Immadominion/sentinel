/// Sentinel Dart SDK
///
/// Provides a complete client interface for the Sentinel smart wallet
/// on Solana, including:
///
/// - Wallet creation and management
/// - Agent registration with scoped permissions
/// - Session key lifecycle (create, use, revoke)
/// - Encrypted key storage (via Rust FFI)
/// - Policy-enforced transaction execution
/// - Guardian recovery
///
/// ## Quick Start
/// ```dart
/// import 'package:sentinel_dart/sentinel_dart.dart';
///
/// final sentinel = SentinelClient(network: SolanaNetwork.devnet);
/// final wallet = await sentinel.createWallet(
///   dailyLimit: SolAmount.sol(10),
///   perTxLimit: SolAmount.sol(1),
/// );
/// ```
library sentinel_dart;

export 'src/client.dart';
export 'src/models/models.dart';
export 'src/wallet/wallet_manager.dart';
export 'src/agent/agent_manager.dart';
export 'src/session/session_manager.dart';
export 'src/core/rust_bridge.dart';

// SIWS (Sign-In With Solana) authentication via MWA
export 'src/auth/siws_types.dart';
export 'src/auth/siws_message.dart';
export 'src/auth/siws_service.dart';
