# What is Seal?

Seal is an **on-chain smart wallet program** deployed on Solana that lets AI agents transact autonomously — without ever holding your private key.

## See It in Action

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 8px; margin: 1.5rem 0;">
  <iframe
    src="https://www.youtube.com/embed/bgC_f6LuOlc"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
    title="Sigil Demo — Agentic Wallet in Action"
  ></iframe>
</div>

> An AI agent transfers SOL from a Seal wallet using nothing but a pairing token from Sigil. No seed phrases, no raw keypairs.

It solves a fundamental problem: AI agents need to sign transactions, but you should never hand them your secret key. Seal introduces a PDA-based delegation layer where agents operate under **cryptographically enforced spending limits**, **time-bounded sessions**, and **program-scoped permissions** — all validated by the Solana runtime itself.

## The Problem

Every wallet solution for autonomous agents today picks one of two bad trade-offs:

| Approach | Problem |
|----------|---------|
| **Share the private key** | Agent has full control. One bug drains everything. |
| **Server-side relay** | Centralized chokepoint. Goes down, agents stop. You're trusting the relay. |
| **Custodial wallets** | Not your keys, not your crypto. Provider can freeze funds. |
| **Per-signature billing** | Pay-per-sig adds up fast for high-frequency agents. |

Seal takes a different path: the **Solana program itself** is the enforcer. No server, no relay, no trust assumptions beyond the blockchain.

## How It Works

```mermaid
sequenceDiagram
    participant Owner
    participant Seal Program
    participant Agent
    participant Session Key
    participant Target dApp

    Owner->>Seal Program: createWallet(limits)
    Seal Program-->>Owner: SmartWallet PDA

    Owner->>Seal Program: registerAgent(scope, limits)
    Seal Program-->>Agent: AgentConfig PDA

    Agent->>Seal Program: createSession(duration, cap)
    Seal Program-->>Session Key: SessionKey PDA

    Session Key->>Seal Program: executeViaSession(amount, data)
    Seal Program->>Seal Program: Validate limits + scope
    Seal Program->>Target dApp: CPI with wallet PDA as signer
    Target dApp-->>Seal Program: Result
    Seal Program-->>Session Key: Update spent counters
```

1. **Owner** creates a SmartWallet PDA with daily and per-transaction spending limits
2. **Owner** registers an agent — scoped to specific programs, instructions, and amounts
3. **Agent** creates a short-lived session key (hours, not days)
4. **Session key** signs transactions. The Seal program validates every policy before executing the CPI
5. Session expires or gets revoked. Agent creates a new one.

The owner's private key is never exposed to the agent. The worst-case scenario for a compromised session key is the session's spending cap — which might be 0.5 SOL for a 2-hour window.

## Why Seal?

### On-Chain Enforcement

Spending limits, program allowlists, and session expiry are validated **inside the Solana program**. There's no middleware, no API server, no admin key that can override the rules. The runtime is the enforcer.

### Zero Per-Signature Cost

Unlike custodial wallet providers that charge per-signature or per-active-wallet fees, Seal charges **nothing** per signature. Once the session key is created, the agent signs directly — no relay, no paywall. You only pay standard Solana transaction fees (~$0.00025).

### Multi-Agent Isolation

Each registered agent gets its own `AgentConfig` PDA with independent spending limits, program scopes, and instruction allowlists. One compromised agent cannot access another agent's session keys or exceed its own limits.

### Self-Custodial

The SmartWallet PDA is derived from your owner pubkey. You — and only you — can register agents, update limits, add guardians, or close the wallet. No third party holds your funds.

### Pinocchio Runtime

Built with [Pinocchio](https://github.com/anza-xyz/pinocchio) instead of Anchor. The program binary is ~100 KB compared to Anchor's ~500 KB+. Lower compute, lower deploy cost, smaller attack surface.

### Guardian Recovery

If the owner key is compromised, guardians can rotate the owner without moving funds. Recovery requires meeting the configured threshold. New wallets start with `recovery_threshold = 1`, so set the threshold explicitly after adding multiple guardians if you want multi-party approval.

## Program ID

The SDK and docs currently reference this program ID by default:

```
EV3TKRVz7pTHpAqBTjP8jmwuvoRBRCpjmVSPHhcMnXqb
```

[View on Solana Explorer →](https://explorer.solana.com/address/EV3TKRVz7pTHpAqBTjP8jmwuvoRBRCpjmVSPHhcMnXqb)

## Next Steps

<div class="tip custom-block" style="padding-top: 8px">
Ready to build? Jump to <a href="/guide/installation">Installation</a> to set up the SDK, or read <a href="/concepts/architecture">Architecture</a> for the full technical deep-dive.
</div>
