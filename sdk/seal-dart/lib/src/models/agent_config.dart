/// On-chain AgentConfig state (Dart mirror).

class AgentConfig {
  final String configAddress;
  final String walletAddress;
  final String agentPubkey;
  final String name;
  final bool isActive;
  final List<String> allowedPrograms;
  final List<String> allowedInstructions;
  final int dailyLimit;
  final int perTxLimit;
  final int defaultSessionDuration;
  final int maxSessionDuration;
  final int totalSpent;
  final int txCount;
  final int spentToday;
  final int dayStartTimestamp;

  const AgentConfig({
    required this.configAddress,
    required this.walletAddress,
    required this.agentPubkey,
    required this.name,
    required this.isActive,
    required this.allowedPrograms,
    required this.allowedInstructions,
    required this.dailyLimit,
    required this.perTxLimit,
    required this.defaultSessionDuration,
    required this.maxSessionDuration,
    required this.totalSpent,
    required this.txCount,
    required this.spentToday,
    required this.dayStartTimestamp,
  });
}
