---
layout: home
title: Seal — AI 代理的智能钱包
lang: zh-CN
description: 为 Solana 上的自主 AI 代理提供链上策略执行。会话密钥、消费限额、守护者恢复。

hero:
  name: Seal
  text: 为真正运行的代理打造的智能钱包。
  tagline: 链上策略执行——不是承诺。你的代理在你定义的边界内操作，由区块链本身强制执行。
  actions:
    - theme: brand
      text: 开始使用 →
      link: /guide/getting-started
    - theme: alt
      text: 查看 GitHub
      link: https://github.com/immadominion/seal

features:
  - icon: 🔑
    title: 会话密钥
    details: 代理获得有时间和金额限制的临时密钥。他们永远无法获得钱包的私钥。会话自动过期。

  - icon: 💰
    title: 每日消费限额
    details: 定义每个代理每天和每笔交易可以消费多少。链上程序强制执行——没有例外，没有技巧。

  - icon: 🛡️
    title: 程序白名单
    details: 你的 LP 机器人只能在 Meteora 上操作。你的狙击机器人只在 Raydium 上操作。即使被攻击，任何代理也无法调用未授权的合约。

  - icon: 🚨
    title: 紧急停止开关
    details: 一次调用立即冻结所有代理。你始终保持完全控制。

  - icon: 👥
    title: 守护者恢复
    details: 丢失了密钥？守护者可以通过多签轮换钱包权限。你的资产始终可以恢复。

  - icon: 🤖
    title: 多代理支持
    details: 每个钱包最多 5 个完全独立的代理。LP 机器人、狙击手、收益优化器——各自拥有独立限额。
---

## 为什么选择 Seal？

Solana 上的 AI 代理正在自主执行交易、管理流动性并与协议交互。但给代理提供完整私钥就好比给员工无限制访问你的银行账户。

Seal 通过链上策略解决了这个问题：

```typescript
// 注册具有严格限制的代理
await client.registerAgent({
  wallet: walletPda,
  agent: agentKeypair.publicKey,
  name: "lp-bot",
  allowedPrograms: [METEORA_PROGRAM_ID],     // 仅限 Meteora
  dailyLimit: 0.1 * LAMPORTS_PER_SOL,        // 每日最多 0.1 SOL
  perTxLimit: 0.05 * LAMPORTS_PER_SOL,       // 每笔交易最多 0.05 SOL
});

// 代理创建会话并执行——无需钱包私钥
const session = await client.createSession({
  duration: 3600,          // 1小时
  maxAmount: 0.05 * 1e9,   // 会话上限
});
```

如果代理试图超出限额，链上程序会**拒绝交易**。即使代理代码被攻击也如此。

[几分钟内开始 →](/zh-CN/guide/getting-started)
