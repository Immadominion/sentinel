<template>
  <div class="features-section">
    <div class="features-container">
      <div 
        v-for="(feature, index) in features" 
        :key="index"
        class="feature-card"
        :style="{ animationDelay: `${index * 0.1}s` }"
      >
        <div class="feature-icon-wrapper">
          <svg class="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path :d="feature.svgPath" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h3 class="feature-title">{{ feature.title }}</h3>
        <p class="feature-details">{{ feature.details }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const features = ref([
  {
    svgPath: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", // Shield icon for enforcement
    title: "On-Chain Enforcement",
    details: "Spending limits, program allowlists, and session expiry live inside the Solana program. No server, no middleware — the runtime is the enforcer."
  },
  {
    svgPath: "M13 2L3 14h9l-1 8 10-12h-9l1-8z", // Lightning icon for zero-cost
    title: "Zero-Cost Signing",
    details: "Unlike competitors charging per signature, Sentinel charges nothing. Session keys sign directly via CPI — no relay, no paywall."
  },
  {
    svgPath: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z", // Hexagon/Isolaton icon
    title: "Multi-Agent Isolation",
    details: "Each agent gets its own AgentConfig PDA with independent limits and scopes. One compromised agent cannot affect another."
  },
  {
    svgPath: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", // Keys/time-bounded icon
    title: "Ephemeral Session Keys",
    details: "Time-bounded, amount-capped, revocable at any moment. Agents create short-lived sessions and discard them, minimizing blast radius."
  },
  {
    svgPath: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75", // Guardian users icon
    title: "Guardian Recovery",
    details: "Rotate the wallet owner via guardian consensus if the master key is compromised. No funds are lost, no downtime required."
  },
  {
    svgPath: "M20 7h-9M14 17H5M20 12H9", // Code lines icon for Pinocchio
    title: "Pinocchio Runtime",
    details: "Built with Pinocchio instead of Anchor — the program binary is ~100KB versus ~500KB+. Lower compute, smaller attack surface."
  }
])
</script>

<style scoped>
.features-section {
  padding: 4rem 2rem 8rem;
  max-width: 1100px;
  margin: 0 auto;
}

.features-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.feature-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  padding: 2rem;
  border-radius: 16px;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
  opacity: 0;
  animation: slideUpFade 0.8s ease forwards;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--vp-c-brand-1), transparent);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  border-color: var(--vp-c-text-1);
  box-shadow: 0 12px 24px var(--vp-c-brand-soft);
}

.feature-card:hover::before {
  opacity: 1;
}

.feature-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  margin-bottom: 1.5rem;
  color: var(--vp-c-text-1);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.feature-card:hover .feature-icon-wrapper {
  transform: scale(1.1) rotate(-5deg);
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  border-color: var(--vp-c-text-1);
}

.feature-icon {
  width: 24px;
  height: 24px;
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 0.75rem 0;
  color: var(--vp-c-text-1);
  letter-spacing: -0.02em;
}

.feature-details {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}

@keyframes slideUpFade {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 1024px) {
  .features-container {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .features-container {
    grid-template-columns: 1fr;
  }
}
</style>
