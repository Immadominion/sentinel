# Sentinel TypeScript SDK

Sentinel Smart Wallet SDK

A TypeScript SDK for interacting with the Sentinel smart wallet program on Solana.
Provides autonomous agent capabilities with on-chain spending limits and scoped permissions.

## Enumerations

- [InstructionDiscriminant](Enumeration.InstructionDiscriminant.md)

## Classes

- [SentinelClient](Class.SentinelClient.md)

## Interfaces

- [AddGuardianParams](Interface.AddGuardianParams.md)
- [AgentConfig](Interface.AgentConfig.md)
- [CloseWalletParams](Interface.CloseWalletParams.md)
- [CreateSessionParams](Interface.CreateSessionParams.md)
- [CreateWalletParams](Interface.CreateWalletParams.md)
- [DeregisterAgentParams](Interface.DeregisterAgentParams.md)
- [ExecuteViaSessionParams](Interface.ExecuteViaSessionParams.md)
- [RecoverWalletParams](Interface.RecoverWalletParams.md)
- [RegisterAgentParams](Interface.RegisterAgentParams.md)
- [RevokeSessionParams](Interface.RevokeSessionParams.md)
- [SentinelClientConfig](Interface.SentinelClientConfig.md)
- [SessionKey](Interface.SessionKey.md)
- [SmartWallet](Interface.SmartWallet.md)
- [UpdateSpendingLimitParams](Interface.UpdateSpendingLimitParams.md)

## Variables

- [AGENT\_CONFIG\_DISCRIMINATOR](Variable.AGENT_CONFIG_DISCRIMINATOR.md)
- [AGENT\_CONFIG\_SIZE](Variable.AGENT_CONFIG_SIZE.md)
- [AGENT\_SEED](Variable.AGENT_SEED.md)
- [DEFAULT\_SESSION\_DURATION\_SECS](Variable.DEFAULT_SESSION_DURATION_SECS.md)
- [MAX\_ALLOWED\_INSTRUCTIONS](Variable.MAX_ALLOWED_INSTRUCTIONS.md)
- [MAX\_ALLOWED\_PROGRAMS](Variable.MAX_ALLOWED_PROGRAMS.md)
- [MAX\_GUARDIANS](Variable.MAX_GUARDIANS.md)
- [MAX\_SESSION\_DURATION\_SECS](Variable.MAX_SESSION_DURATION_SECS.md)
- [SENTINEL\_PROGRAM\_ID](Variable.SENTINEL_PROGRAM_ID.md)
- [SESSION\_KEY\_DISCRIMINATOR](Variable.SESSION_KEY_DISCRIMINATOR.md)
- [SESSION\_KEY\_SIZE](Variable.SESSION_KEY_SIZE.md)
- [SESSION\_SEED](Variable.SESSION_SEED.md)
- [SMART\_WALLET\_DISCRIMINATOR](Variable.SMART_WALLET_DISCRIMINATOR.md)
- [SMART\_WALLET\_SIZE](Variable.SMART_WALLET_SIZE.md)
- [WALLET\_SEED](Variable.WALLET_SEED.md)

## Functions

- [addGuardianInstruction](Function.addGuardianInstruction.md)
- [closeWalletInstruction](Function.closeWalletInstruction.md)
- [createSessionInstruction](Function.createSessionInstruction.md)
- [createWalletInstruction](Function.createWalletInstruction.md)
- [deregisterAgentInstruction](Function.deregisterAgentInstruction.md)
- [deriveAgentPda](Function.deriveAgentPda.md)
- [deriveSessionPda](Function.deriveSessionPda.md)
- [deriveWalletPda](Function.deriveWalletPda.md)
- [deserializeAgentConfig](Function.deserializeAgentConfig.md)
- [deserializeSessionKey](Function.deserializeSessionKey.md)
- [deserializeSmartWallet](Function.deserializeSmartWallet.md)
- [executeViaSessionInstruction](Function.executeViaSessionInstruction.md)
- [getSessionRemainingBudget](Function.getSessionRemainingBudget.md)
- [isSessionValid](Function.isSessionValid.md)
- [recoverWalletInstruction](Function.recoverWalletInstruction.md)
- [registerAgentInstruction](Function.registerAgentInstruction.md)
- [revokeSessionInstruction](Function.revokeSessionInstruction.md)
- [solToLamports](Function.solToLamports.md)
- [updateSpendingLimitInstruction](Function.updateSpendingLimitInstruction.md)
