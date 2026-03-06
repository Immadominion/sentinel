/// SIWS message builder.
///
/// Constructs Sign-In With Solana messages following the
/// [SIWS specification](https://github.com/phantom/sign-in-with-solana).
///
/// The message format is deterministic — given the same inputs,
/// it always produces the same string. This allows both client
/// and server to independently construct/validate messages.
library;

import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'siws_types.dart';

/// Builds and parses SIWS message strings.
///
/// Message format (newline-delimited):
/// ```
/// {domain} wants you to sign in with your Solana account:
/// {walletAddress}
///
/// {statement}
///
/// URI: {uri}
/// Version: {version}
/// Chain ID: {chainId}
/// Nonce: {nonce}
/// Issued At: {issuedAt}
/// ```
class SiwsMessage {
  /// Build a SIWS message string.
  ///
  /// All fields come from [config] except:
  /// - [walletAddress]: discovered via MWA authorize
  /// - [nonce]: fetched from server before MWA session
  /// - [issuedAt]: current UTC timestamp (auto-generated if null)
  static String build({
    required SiwsConfig config,
    required String walletAddress,
    required String nonce,
    DateTime? issuedAt,
  }) {
    final timestamp = (issuedAt ?? DateTime.now().toUtc()).toIso8601String();

    return [
      '${config.domain} wants you to sign in with your Solana account:',
      walletAddress,
      '',
      config.statement,
      '',
      'URI: ${config.uri}',
      'Version: ${config.version}',
      'Chain ID: ${config.chainId}',
      'Nonce: $nonce',
      'Issued At: $timestamp',
    ].join('\n');
  }

  /// Encode a SIWS message string to bytes for signing.
  static Uint8List encode(String message) {
    return Uint8List.fromList(utf8.encode(message));
  }

  /// Generate a cryptographically random nonce (32 hex characters).
  ///
  /// This is a fallback for when the server doesn't provide a nonce.
  /// Prefer server-generated nonces for replay protection.
  static String generateLocalNonce() {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  }

  /// Parse the wallet address from a SIWS message.
  ///
  /// Returns null if the message doesn't match SIWS format.
  static String? parseWalletAddress(String message) {
    final lines = message.split('\n');
    if (lines.length < 2) return null;
    if (!lines[0].contains('wants you to sign in with your Solana account:')) {
      return null;
    }
    return lines[1].trim();
  }

  /// Parse the nonce from a SIWS message.
  static String? parseNonce(String message) {
    final match = RegExp(r'Nonce: (.+)').firstMatch(message);
    return match?.group(1)?.trim();
  }

  /// Parse the issued-at timestamp from a SIWS message.
  static DateTime? parseIssuedAt(String message) {
    final match = RegExp(r'Issued At: (.+)').firstMatch(message);
    if (match == null) return null;
    return DateTime.tryParse(match.group(1)!.trim());
  }
}
