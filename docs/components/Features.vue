<template>
  <div class="bento-section">
    <div class="bento-header">
      <span class="bento-label">BUILT DIFFERENT</span>
      <h2 class="bento-title">Why Sentinel?</h2>
    </div>
    <div class="bento-grid">
      <!-- Large card: On-Chain Enforcement (spans 2 cols) -->
      <div class="bento-card bento-wide">
        <div class="card-accent accent-grid"></div>
        <div class="card-body">
          <span class="card-tag">CORE</span>
          <h3 class="card-title">On-Chain Enforcement</h3>
          <p class="card-description">
            Spending limits, program allowlists, and session expiry live inside the Solana program. No server, no middleware — the runtime is the enforcer.
          </p>
        </div>
        <div class="card-visual">
          <svg viewBox="0 0 120 120" fill="none">
            <rect x="10" y="10" width="100" height="100" rx="12" stroke="currentColor" stroke-width="1.5" opacity="0.2"/>
            <rect x="25" y="25" width="70" height="70" rx="8" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
            <path d="M60 40v40M40 60h40" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
            <circle cx="60" cy="60" r="8" stroke="currentColor" stroke-width="1.5" fill="currentColor" opacity="0.1"/>
          </svg>
        </div>
      </div>

      <!-- Tall card: Zero-Cost Signing (spans 2 rows) -->
      <div class="bento-card bento-tall">
        <div class="card-accent accent-rays"></div>
        <div class="card-body">
          <span class="card-tag">ECONOMICS</span>
          <h3 class="card-title">Zero-Cost Signing</h3>
          <p class="card-description">
            Unlike competitors charging per signature, Sentinel charges nothing. Session keys sign directly via CPI — no relay, no paywall.
          </p>
        </div>
        <div class="card-metric">
          <span class="metric-value">$0</span>
          <span class="metric-label">per signature</span>
        </div>
      </div>

      <!-- Standard card: Multi-Agent Isolation -->
      <div class="bento-card">
        <div class="card-accent accent-dots"></div>
        <div class="card-body">
          <span class="card-tag">SECURITY</span>
          <h3 class="card-title">Multi-Agent Isolation</h3>
          <p class="card-description">
            Each agent gets its own AgentConfig PDA with independent limits and scopes. One compromised agent cannot affect another.
          </p>
        </div>
      </div>

      <!-- Standard card: Ephemeral Session Keys -->
      <div class="bento-card">
        <div class="card-accent accent-sweep"></div>
        <div class="card-body">
          <span class="card-tag">KEYS</span>
          <h3 class="card-title">Ephemeral Session Keys</h3>
          <p class="card-description">
            Time-bounded, amount-capped, revocable at any moment. Agents create short-lived sessions and discard them.
          </p>
        </div>
      </div>

      <!-- Standard card: Guardian Recovery -->
      <div class="bento-card">
        <div class="card-accent accent-ring"></div>
        <div class="card-body">
          <span class="card-tag">RECOVERY</span>
          <h3 class="card-title">Guardian Recovery</h3>
          <p class="card-description">
            Rotate the wallet owner via guardian consensus if the master key is compromised. No funds lost, no downtime.
          </p>
        </div>
      </div>

      <!-- Wide card: Pinocchio Runtime (spans 2 cols) -->
      <div class="bento-card bento-wide">
        <div class="card-accent accent-lines"></div>
        <div class="card-body">
          <span class="card-tag">RUNTIME</span>
          <h3 class="card-title">Pinocchio Runtime</h3>
          <p class="card-description">
            Built with Pinocchio instead of Anchor — the program binary is ~100KB versus ~500KB+. Lower compute, smaller attack surface, faster execution.
          </p>
        </div>
        <div class="card-comparison">
          <div class="comparison-bar">
            <div class="bar-fill bar-sentinel">
              <span>~100KB</span>
            </div>
          </div>
          <div class="comparison-bar">
            <div class="bar-fill bar-anchor">
              <span>~500KB+</span>
            </div>
          </div>
          <div class="comparison-labels">
            <span>Sentinel</span>
            <span>Anchor</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.bento-section {
  padding: 2rem 2rem 8rem;
  max-width: 1200px;
  margin: 0 auto;
}

.bento-header {
  text-align: center;
  margin-bottom: 3rem;
}

.bento-label {
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  display: block;
  margin-bottom: 0.75rem;
}

.bento-title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0;
  color: var(--vp-c-text-1);
}

/* --- Bento Grid --- */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.bento-card {
  position: relative;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 2rem;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 220px;
}

.bento-card:hover {
  border-color: var(--vp-c-text-3);
  transform: translateY(-2px);
  box-shadow: 0 16px 48px -12px rgba(0, 0, 0, 0.15);
}

html.dark .bento-card:hover {
  box-shadow: 0 16px 48px -12px rgba(0, 0, 0, 0.5);
}

/* Wide card: spans 2 columns */
.bento-wide {
  grid-column: span 2;
  flex-direction: row;
  align-items: center;
  gap: 2rem;
}

/* Tall card: spans 2 rows */
.bento-tall {
  grid-row: span 2;
}

/* --- Card Content --- */
.card-body {
  flex: 1;
  position: relative;
  z-index: 2;
}

.card-tag {
  font-family: var(--vp-font-family-mono);
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
  display: inline-block;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 0.75rem 0;
  color: var(--vp-c-text-1);
}

.card-description {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  margin: 0;
}

/* --- Card Visuals --- */
.card-visual {
  flex-shrink: 0;
  width: 120px;
  height: 120px;
  position: relative;
  z-index: 2;
  color: var(--vp-c-text-3);
  opacity: 0.5;
  transition: opacity 0.4s ease;
}

.bento-card:hover .card-visual {
  opacity: 0.8;
}

.card-visual svg {
  width: 100%;
  height: 100%;
}

/* --- Metric Display --- */
.card-metric {
  position: relative;
  z-index: 2;
  margin-top: 1.5rem;
  text-align: center;
  padding: 1.5rem 0;
}

.metric-value {
  display: block;
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--vp-c-text-1);
  line-height: 1;
}

.metric-label {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  letter-spacing: 0.02em;
}

/* --- Comparison Bars --- */
.card-comparison {
  flex-shrink: 0;
  width: 220px;
  position: relative;
  z-index: 2;
}

.comparison-bar {
  height: 28px;
  background: var(--vp-c-bg-elv);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.5rem;
  border: 1px solid var(--vp-c-divider);
}

.bar-fill {
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 0.75rem;
  font-size: 0.7rem;
  font-family: var(--vp-font-family-mono);
  font-weight: 600;
  border-radius: 5px;
}

.bar-sentinel {
  width: 20%;
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
}

.bar-anchor {
  width: 100%;
  background: var(--vp-c-text-3);
  color: var(--vp-c-bg);
  opacity: 0.4;
}

.comparison-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}

/* --- Accent Decorations --- */
.card-accent {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
  opacity: 0.06;
  transition: opacity 0.4s ease;
}

.bento-card:hover .card-accent {
  opacity: 0.1;
}

.accent-grid {
  background-image: 
    linear-gradient(0deg, var(--vp-c-text-1) 1px, transparent 1px),
    linear-gradient(90deg, var(--vp-c-text-1) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: radial-gradient(circle at 80% 20%, black 0%, transparent 60%);
  -webkit-mask-image: radial-gradient(circle at 80% 20%, black 0%, transparent 60%);
}

.accent-rays {
  background: conic-gradient(from 0deg at 50% 100%, var(--vp-c-text-1) 0deg, transparent 60deg, transparent 300deg, var(--vp-c-text-1) 360deg);
  mask-image: radial-gradient(circle at 50% 100%, black 0%, transparent 70%);
  -webkit-mask-image: radial-gradient(circle at 50% 100%, black 0%, transparent 70%);
}

.accent-dots {
  background-image: radial-gradient(circle, var(--vp-c-text-1) 1px, transparent 1px);
  background-size: 16px 16px;
  mask-image: radial-gradient(circle at 90% 10%, black 0%, transparent 50%);
  -webkit-mask-image: radial-gradient(circle at 90% 10%, black 0%, transparent 50%);
}

.accent-sweep {
  background: linear-gradient(135deg, var(--vp-c-text-1) 0%, transparent 60%);
  mask-image: radial-gradient(circle at 0% 0%, black 0%, transparent 50%);
  -webkit-mask-image: radial-gradient(circle at 0% 0%, black 0%, transparent 50%);
}

.accent-ring {
  background: radial-gradient(circle at 80% 80%, var(--vp-c-text-1) 20%, transparent 21%, transparent 30%, var(--vp-c-text-1) 31%, transparent 32%);
}

.accent-lines {
  background-image: repeating-linear-gradient(
    -45deg,
    var(--vp-c-text-1) 0px,
    var(--vp-c-text-1) 1px,
    transparent 1px,
    transparent 12px
  );
  mask-image: radial-gradient(circle at 90% 50%, black 0%, transparent 50%);
  -webkit-mask-image: radial-gradient(circle at 90% 50%, black 0%, transparent 50%);
}

/* --- Responsive --- */
@media (max-width: 1024px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .bento-wide {
    grid-column: span 2;
  }
  .bento-tall {
    grid-row: span 1;
  }
}

@media (max-width: 640px) {
  .bento-grid {
    grid-template-columns: 1fr;
  }
  .bento-wide {
    grid-column: span 1;
    flex-direction: column;
  }
  .card-visual,
  .card-comparison {
    width: 100%;
  }
  .bento-section {
    padding: 2rem 1rem 6rem;
  }
}
</style>
