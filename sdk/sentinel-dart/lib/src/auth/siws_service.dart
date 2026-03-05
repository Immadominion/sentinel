/// SIWS authentication service — MWA-aware.
///
/// Orchestrates the full Sign-In With Solana flow using Mobile
/// Wallet Adapter on Android. Designed to work correctly on
/// Solana Seeker and other Android devices where backgrounded
/// apps lose network access.
///
/// ## Architecture
///
/// The flow is split into three phases to avoid making HTTP calls
/// while the app is backgrounded (during wallet interaction):
///
/// ```
/// Phase 1 (foreground): Fetch nonce from server    ← HTTP
/// Phase 2 (background): MWA authorize + sign       ← local only
/// Phase 3 (foreground): Verify signature on server  ← HTTP
/// ```
///
/// ## Usage
///
/// ```dart
/// final siws = SiwsService(config: SiwsConfig.sage);
///
/// final result = await siws.signIn(
///   fetchNonce: () async {
///     final res = await dio.post('/auth/nonce');
///     return res.data['nonce'] as String;
///   },
///   verify: (payload) async {
///     final res = await dio.post('/auth/verify', data: {
///       'walletAddress': payload.walletAddress,
///       'signature': base58.encode(payload.signatureBytes),
///       'message': payload.message,
///     });
///     return res.data as Map<String, dynamic>;
///   },
/// );
///
/// print('Signed in as ${result.walletAddress}');
/// ```
library;

import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:solana_mobile_client/solana_mobile_client.dart';

import 'siws_message.dart';
import 'siws_types.dart';

// ── Minimal base58 encoder (Bitcoin alphabet) ──────────────────
// Avoids a dependency on bs58 just for address encoding.
const _b58Alphabet =
    '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

String _base58encode(Uint8List bytes) {
  if (bytes.isEmpty) return '';
  var zeros = 0;
  while (zeros < bytes.length && bytes[zeros] == 0) {
    zeros++;
  }
  final encoded = <int>[];
  var start = zeros;
  while (start < bytes.length) {
    var carry = 0;
    for (var i = start; i < bytes.length; i++) {
      carry = carry * 256 + bytes[i];
      bytes[i] = carry ~/ 58;
      carry = carry % 58;
    }
    encoded.add(carry);
    while (start < bytes.length && bytes[start] == 0) {
      start++;
    }
  }
  final buf = StringBuffer();
  for (var i = 0; i < zeros; i++) {
    buf.write('1');
  }
  for (var i = encoded.length - 1; i >= 0; i--) {
    buf.write(_b58Alphabet[encoded[i]]);
  }
  return buf.toString();
}

// ═══════════════════════════════════════════════════════════════
// SiwsService
// ═══════════════════════════════════════════════════════════════

/// Orchestrates SIWS authentication via Mobile Wallet Adapter.
///
/// This service is **backend-agnostic** — you provide callbacks
/// for nonce fetching and signature verification. It handles
/// MWA session management internally.
///
/// ### Seeker Compatibility
///
/// On Solana Seeker, backgrounded apps lose network access.
/// This service fetches the nonce **before** opening MWA and
/// verifies the signature **after** MWA closes, ensuring all
/// HTTP calls happen while the app is in the foreground.
class SiwsService {
  /// SIWS configuration (domain, statement, chain, etc.).
  final SiwsConfig config;

  /// Last connected wallet address (base58).
  String? _walletAddress;

  /// Stored MWA auth token for future reauthorize calls.
  String? _mwaAuthToken;

  /// Currently connected wallet address, or null.
  String? get walletAddress => _walletAddress;

  /// MWA auth token from the last sign-in (for future reauthorize).
  String? get mwaAuthToken => _mwaAuthToken;

  /// Whether MWA is available on this device.
  bool get isAvailable => Platform.isAndroid;

  SiwsService({required this.config});

  /// Perform a full SIWS sign-in via MWA.
  ///
  /// ### Flow
  ///
  /// 1. **[fetchNonce]** is called while the app is in the
  ///    foreground. Your backend generates a random nonce and
  ///    returns it.
  ///
  /// 2. **MWA session opens** — the wallet app comes to the
  ///    foreground. Inside the session:
  ///    - `authorize` → user approves → we get the wallet address
  ///    - Build the SIWS message locally (no network needed)
  ///    - `signMessages` → user confirms → we get the signature
  ///
  /// 3. **MWA session closes** — the app returns to the
  ///    foreground. **[verify]** is called with the signed
  ///    payload so your backend can verify the Ed25519 signature
  ///    and return auth tokens.
  ///
  /// ### Type parameter
  ///
  /// `T` is whatever your backend returns on successful
  /// verification (e.g. a `User` object, a JWT map, etc.).
  ///
  /// ### Throws
  ///
  /// - [SiwsException] with a categorized [SiwsFailureReason]
  Future<SiwsResult<T>> signIn<T>({
    required Future<String> Function() fetchNonce,
    required Future<T> Function(SiwsVerifyPayload payload) verify,
  }) async {
    if (!isAvailable) {
      throw const SiwsException(
        'MWA is only available on Android',
        reason: SiwsFailureReason.mwaUnavailable,
      );
    }

    // ── Phase 1: Fetch nonce (app in foreground) ──────────────
    debugPrint('[SIWS] Phase 1: Fetching nonce from server...');
    final String nonce;
    try {
      nonce = await fetchNonce();
    } catch (e) {
      throw SiwsException(
        'Failed to fetch nonce: $e',
        reason: SiwsFailureReason.networkError,
      );
    }
    debugPrint('[SIWS] Got nonce: ${nonce.substring(0, 8)}...');

    // ── Phase 2: MWA session (app goes to background) ─────────
    debugPrint('[SIWS] Phase 2: Opening MWA session...');
    late final String walletAddress;
    late final Uint8List signature;
    late final String message;
    String? walletName;
    String? mwaAuthToken;

    final session = await LocalAssociationScenario.create();
    try {
      // Fire-and-forget: launches wallet app picker.
      session.startActivityForResult(null).ignore();
      final client = await session.start();

      // Step 2a: Authorize — wallet shows approval prompt.
      final auth = await client.authorize(
        identityUri: Uri.parse(config.uri),
        identityName: config.appName,
        iconUri: Uri.parse(config.appIconPath),
        cluster: config.cluster,
      );

      if (auth == null) {
        throw const SiwsException(
          'User cancelled wallet authorization',
          reason: SiwsFailureReason.userCancelled,
        );
      }

      walletAddress = _base58encode(Uint8List.fromList(auth.publicKey));
      walletName = auth.accountLabel;
      mwaAuthToken = auth.authToken;
      debugPrint('[SIWS] Authorized wallet: $walletAddress');

      // Step 2b: Build SIWS message locally (no HTTP needed).
      message = SiwsMessage.build(
        config: config,
        walletAddress: walletAddress,
        nonce: nonce,
      );
      debugPrint('[SIWS] Built SIWS message (${message.length} chars)');

      // Step 2c: Sign the message — wallet shows sign prompt.
      final result = await client.signMessages(
        messages: [SiwsMessage.encode(message)],
        addresses: [Uint8List.fromList(auth.publicKey)],
      );

      if (result.signedMessages.isEmpty ||
          result.signedMessages.first.signatures.isEmpty) {
        throw const SiwsException(
          'Wallet did not return a signature',
          reason: SiwsFailureReason.signingFailed,
        );
      }

      signature = Uint8List.fromList(
        result.signedMessages.first.signatures.first,
      );
      debugPrint('[SIWS] Message signed (${signature.length} bytes)');
    } finally {
      await session.close();
      debugPrint('[SIWS] MWA session closed');
    }

    // ── Phase 3: Verify signature (app back in foreground) ────
    debugPrint('[SIWS] Phase 3: Verifying signature with server...');
    final payload = SiwsVerifyPayload(
      walletAddress: walletAddress,
      signatureBytes: signature,
      message: message,
      nonce: nonce,
    );

    final T serverData;
    try {
      serverData = await verify(payload);
    } catch (e) {
      if (e is SiwsException) rethrow;
      throw SiwsException(
        'Verification failed: $e',
        reason: SiwsFailureReason.verificationFailed,
      );
    }

    // Cache wallet state.
    _walletAddress = walletAddress;
    _mwaAuthToken = mwaAuthToken;

    debugPrint('[SIWS] Sign-in complete for $walletAddress');

    return SiwsResult<T>(
      walletAddress: walletAddress,
      mwaAuthToken: mwaAuthToken,
      walletName: walletName,
      serverData: serverData,
    );
  }

  /// Clear cached wallet state.
  void disconnect() {
    _walletAddress = null;
    _mwaAuthToken = null;
  }
}
