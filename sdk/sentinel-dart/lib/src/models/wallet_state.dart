/// On-chain SmartWallet state (Dart mirror).

class WalletState {
  final String address;
  final String owner;
  final int agentCount;
  final int guardianCount;
  final List<String> guardians;
  final int dailyLimitLamports;
  final int perTxLimitLamports;
  final int spentTodayLamports;
  final bool isLocked;
  final bool isClosed;

  const WalletState({
    required this.address,
    required this.owner,
    required this.agentCount,
    required this.guardianCount,
    required this.guardians,
    required this.dailyLimitLamports,
    required this.perTxLimitLamports,
    required this.spentTodayLamports,
    required this.isLocked,
    required this.isClosed,
  });
}
