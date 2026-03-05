/// Main entry point for the Sentinel SDK.
///
/// [SentinelClient] wraps all sub-managers and provides a unified
/// API for interacting with the Sentinel smart wallet program.

// ignore_for_file: avoid_print

enum SolanaNetwork { mainnet, devnet, localnet }

/// High-level client for the Sentinel smart wallet.
class SentinelClient {
  final SolanaNetwork network;
  final String? rpcUrl;

  // TODO: Add sub-managers once codama generated types are ready
  // late final WalletManager wallet;
  // late final AgentManager agent;
  // late final SessionManager session;

  SentinelClient({this.network = SolanaNetwork.devnet, this.rpcUrl});

  String get effectiveRpcUrl {
    if (rpcUrl != null) return rpcUrl!;
    return switch (network) {
      SolanaNetwork.mainnet => 'https://api.mainnet-beta.solana.com',
      SolanaNetwork.devnet => 'https://api.devnet.solana.com',
      SolanaNetwork.localnet => 'http://localhost:8899',
    };
  }

  /// Check if the Sentinel program is deployed on the target network.
  Future<bool> isProgramDeployed() async {
    // TODO: Implement RPC getAccountInfo check
    return false;
  }
}
