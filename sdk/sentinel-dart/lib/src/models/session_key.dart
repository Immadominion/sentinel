/// On-chain SessionKey state (Dart mirror).

class SessionKey {
  final String sessionAddress;
  final String walletAddress;
  final String agentPubkey;
  final String sessionPubkey;
  final DateTime createdAt;
  final DateTime expiresAt;
  final int maxAmount;
  final int amountSpent;
  final int maxPerTx;
  final bool isRevoked;

  const SessionKey({
    required this.sessionAddress,
    required this.walletAddress,
    required this.agentPubkey,
    required this.sessionPubkey,
    required this.createdAt,
    required this.expiresAt,
    required this.maxAmount,
    required this.amountSpent,
    required this.maxPerTx,
    required this.isRevoked,
  });

  bool get isExpired => DateTime.now().isAfter(expiresAt);

  bool get isValid => !isRevoked && !isExpired;

  bool canSpend(int amount) =>
      isValid && amount <= maxPerTx && (amountSpent + amount) <= maxAmount;
}
