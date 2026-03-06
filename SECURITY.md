# Seal Smart Wallet Security Notes

This document is the user-facing security summary for the current Seal implementation.
It focuses on how the system behaves today, what operators should configure deliberately, and which integration constraints still deserve extra care.

## Current recovery behavior

Seal supports guardian recovery with a configurable `recovery_threshold`.

- New wallets start with `recovery_threshold = 1`
- Recovery requires at least `recovery_threshold` unique registered guardians to sign
- The wallet PDA remains stable through recovery because it is derived from immutable `pda_authority`, not the rotatable `owner`

### Recommended recovery setup

If you add more than one guardian, set the threshold explicitly so the approval model matches your intent.

Examples:

- 1 guardian → threshold `1`
- 3 guardians → threshold `2` or `3`
- 5 guardians → threshold `3` or higher for stronger quorum control

If you leave the default threshold unchanged after adding multiple guardians, recovery remains effectively single-guardian.

## Agent allowlists

Agent program access is default-closed on-chain.

- An agent with no allowed programs cannot execute anything
- Allowed instruction discriminators are optional and are only needed for tighter scoping inside an already allowed program

Operational guidance:

- keep the allowed-program list narrow
- include only the protocols and support programs the bot actually needs
- prefer adding instruction-level restrictions for especially sensitive programs

## Spending enforcement

Seal enforces three independent spending layers:

1. wallet-level limits
2. agent-level limits
3. session-level limits

The most restrictive limit wins.

### Important integration note

`ExecuteViaSession` tracks spend using the `amount_lamports` value supplied by the caller.
Integrations should only wrap well-understood instructions, keep program allowlists tight, and validate expected balance changes in application logic.

## Session signer operations

In delegated trading flows, the session signer should hold enough SOL to pay outer transaction fees.

Recommended operator checks:

- keep a fee buffer on the session signer
- alert when the balance drops below the operating threshold
- refuse to send transactions when the signer is underfunded

## Deployment and audit posture

- use the intended cluster-specific `SEAL_PROGRAM_ID` for each environment
- verify backend, client, and automation all point to the same cluster
- review the live deployment configuration before enabling real capital

Seal has strong automated test coverage, but that is not a substitute for careful rollout discipline.
For mainnet use, keep limits conservative and stage live exposure gradually.
