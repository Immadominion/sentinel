---
layout: home
hero:
  name: Sentinel
  text: Autonomous wallet infrastructure for Solana.
  tagline: On-chain session keys, spending limits, and guardian recovery — so your AI agents trade autonomously without ever holding your private key.
  image:
    src: /sentinel-logo.png
    alt: Sentinel
  actions:
    - theme: brand
      text: Get Started →
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/immadominion/sentinel

features:
  - icon: 🔐
    title: On-Chain Enforcement
    details: Spending limits, program allowlists, and session expiry live inside the Solana program. No server, no middleware, no trust assumptions — the runtime is the enforcer.
  - icon: ⚡
    title: Zero-Cost Signing
    details: Unlike Privy ($0.01/sig) or Crossmint ($0.05/MAW), Sentinel charges nothing per signature. Session keys sign directly via CPI — no relay, no paywall.
  - icon: 🤖
    title: Multi-Agent Isolation
    details: Each agent gets its own AgentConfig PDA with independent limits and program scopes. One compromised agent cannot affect another.
  - icon: 🔑
    title: Ephemeral Session Keys
    details: Time-bounded, amount-capped, revocable at any moment. Agents create short-lived sessions and discard them — minimizing blast radius.
  - icon: 🛡️
    title: Guardian Recovery
    details: Rotate the wallet owner via guardian consensus if the master key is compromised. No funds are lost, no downtime.
  - icon: 📦
    title: Pinocchio Runtime
    details: Built with Pinocchio instead of Anchor — the program binary is ~100KB vs ~500KB+. Lower compute, lower deploy cost, smaller attack surface.
---

<div style="text-align: center; margin-top: 2rem; opacity: 0.7; font-size: 0.9rem;">
  <p>Deployed on Solana devnet · Program ID: <code>EV3TKRVz7pTHpAqBTjP8jmwuvoRBRCpjmVSPHhcMnXqb</code></p>
</div>
