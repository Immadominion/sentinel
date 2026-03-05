---
layout: home
title: Sentinel — Billeteras inteligentes para agentes AI
lang: es
description: Cumplimiento de políticas en cadena para agentes autónomos en Solana. Claves de sesión, límites de gasto, recuperación con guardianes.

hero:
  name: Sentinel
  text: Billeteras inteligentes para agentes que realmente operan.
  tagline: Cumplimiento de políticas en cadena — no promesas. Tus agentes actúan dentro de los límites que tú defines, aplicados directamente en la blockchain.
  actions:
    - theme: brand
      text: Empezar →
      link: /es/guide/getting-started
    - theme: alt
      text: Ver en GitHub
      link: https://github.com/immadominion/sentinel

features:
  - icon: 🔑
    title: Claves de Sesión
    details: Los agentes reciben claves efímeras con límite de tiempo y monto. Nunca tienen la clave privada del monedero. Las sesiones expiran automáticamente.

  - icon: 💰
    title: Límites de Gasto Diarios
    details: Define cuánto puede gastar cada agente por día y por transacción. El programa en cadena lo aplica — sin excepciones, sin trucos.

  - icon: 🛡️
    title: Listas de Programas Permitidos
    details: Tu bot LP se queda en Meteora. Tu bot sniper en Raydium. Ningún agente puede llamar contratos no autorizados aunque sea comprometido.

  - icon: 🚨
    title: Interruptor de Emergencia
    details: Una llamada congela todos los agentes instantáneamente. Tú tienes el control total, siempre.

  - icon: 👥
    title: Recuperación con Guardianes
    details: Perdiste tu clave? Los guardianes pueden rotar la autoridad del monedero mediante firma múltiple. Tu capital siempre recuperable.

  - icon: 🤖
    title: Soporte Multi-Agente
    details: Hasta 5 agentes completamente independientes por monedero. Bot LP, sniper, optimizador de yield — cada uno con sus propios límites.
---

## ¿Por qué Sentinel?

Los agentes AI en Solana están ejecutando trades, gestionando liquidez e interactuando con protocolos de forma autónoma. Pero darle a un agente una clave privada completa es como darle a un empleado acceso ilimitado a tu cuenta bancaria.

Sentinel resuelve esto con políticas en cadena:

```typescript
// Registra un agente con límites estrictos
await client.registerAgent({
  wallet: walletPda,
  agent: agentKeypair.publicKey,
  name: "lp-bot",
  allowedPrograms: [METEORA_PROGRAM_ID],     // Solo Meteora
  dailyLimit: 0.1 * LAMPORTS_PER_SOL,        // 0.1 SOL/día máximo
  perTxLimit: 0.05 * LAMPORTS_PER_SOL,       // 0.05 SOL por tx
});

// El agente crea una sesión y ejecuta — SIN clave privada del monedero
const session = await client.createSession({
  duration: 3600,          // 1 hora
  maxAmount: 0.05 * 1e9,   // Tope de sesión
});
```

Si el agente intenta gastar más del límite, el programa en cadena **rechaza la transacción**. Aunque el código del agente esté comprometido.

[Comenzar en minutos →](/es/guide/getting-started)
