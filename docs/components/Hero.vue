<template>
  <div class="hero-container" @mousemove="handleMouseMove">
    <!-- Grid overlay for technical feel -->
    <div class="bg-grid"></div>
    
    <!-- Dynamic glow element following mouse -->
    <div 
      class="glow-orb" 
      :style="{ transform: `translate(${mouseX * 0.05}px, ${mouseY * 0.05}px)` }"
    ></div>

    <div class="hero-inner">
      <!-- Left: Text content -->
      <div class="content-wrapper">
        <div class="badge-wrapper" ref="badgeRef">
          <span class="badge">v0.1.0 • Deployed on Devnet</span>
        </div>

        <h1 class="hero-title" ref="titleRef">
          Autonomous wallet<br />
          <span class="text-highlight">infrastructure</span> for Solana.
        </h1>

        <p class="hero-tagline" ref="taglineRef">
          On-chain session keys, spending limits, and guardian recovery — so your AI agents trade autonomously without ever holding your private key.
        </p>

        <div class="hero-actions" ref="actionsRef">
          <a href="/guide/getting-started" class="action-btn primary-btn">
            Get Started
            <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
          <a href="https://github.com/immadominion/seal" class="action-btn secondary-btn" target="_blank" rel="noopener">
            View on GitHub
          </a>
        </div>
      </div>

      <!-- Right: Rive Robot -->
      <div class="robot-container" ref="robotContainerRef">
        <RiveRobot />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import gsap from 'gsap'
import RiveRobot from './RiveRobot.vue'

const titleRef = ref(null)
const taglineRef = ref(null)
const actionsRef = ref(null)
const badgeRef = ref(null)
const robotContainerRef = ref(null)

const mouseX = ref(0)
const mouseY = ref(0)

const handleMouseMove = (e) => {
  mouseX.value = e.clientX - window.innerWidth / 2
  mouseY.value = e.clientY - window.innerHeight / 2
}

onMounted(() => {
  const tl = gsap.timeline()
  
  gsap.set([badgeRef.value, titleRef.value, taglineRef.value, actionsRef.value], { 
    y: 30, 
    autoAlpha: 0 
  })
  gsap.set(robotContainerRef.value, { 
    x: 60, 
    autoAlpha: 0 
  })

  tl.to(badgeRef.value, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out' })
    .to(titleRef.value, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out' }, '-=0.6')
    .to(taglineRef.value, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out' }, '-=0.6')
    .to(actionsRef.value, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out' }, '-=0.6')
    .to(robotContainerRef.value, { x: 0, autoAlpha: 1, duration: 1.2, ease: 'power2.out' }, '-=0.8')
})
</script>

<style scoped>
.hero-container {
  position: relative;
  min-height: calc(100vh - var(--vp-nav-height));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: clip;
  overflow-clip-margin: 80px;
  padding: 4rem 2rem;
  color: var(--vp-c-text-1);
}

.bg-grid {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-size: 50px 50px;
  background-image: linear-gradient(to right, var(--vp-c-divider) 1px, transparent 1px),
                    linear-gradient(to bottom, var(--vp-c-divider) 1px, transparent 1px);
  mask-image: radial-gradient(circle at center, black 0%, transparent 70%);
  -webkit-mask-image: radial-gradient(circle at center, black 0%, transparent 70%);
  z-index: 0;
  opacity: 0.3;
}

.glow-orb {
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, var(--vp-c-brand-1) 0%, transparent 60%);
  border-radius: 50%;
  opacity: 0.05;
  filter: blur(60px);
  z-index: 0;
  pointer-events: none;
  transition: transform 0.1s ease-out;
}

.hero-inner {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  width: 100%;
  gap: 2rem;
}

.content-wrapper {
  flex: 1;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.robot-container {
  flex-shrink: 0;
  width: 500px;
  height: 600px;
  position: relative;
  overflow: visible;
}

.badge-wrapper {
  margin-bottom: 2rem;
}

.badge {
  font-family: var(--vp-font-family-mono);
  font-size: 0.75rem;
  padding: 0.4rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.hero-title {
  font-size: clamp(2.8rem, 5vw, 5rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.04em;
  margin: 0;
  text-shadow: 0 4px 24px rgba(0,0,0,0.1);
}

html.dark .hero-title {
  text-shadow: 0 4px 34px rgba(0,0,0,0.4);
}

.text-highlight {
  position: relative;
  display: inline-block;
  color: var(--vp-c-bg);
  background-color: var(--vp-c-text-1);
  padding: 0 0.5rem;
  border-radius: 8px;
  transform: rotate(-1deg);
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

html.dark .text-highlight {
  box-shadow: 0 10px 30px rgba(255,255,255,0.05);
}

.hero-tagline {
  margin-top: 1.5rem;
  font-size: clamp(1.05rem, 1.8vw, 1.3rem);
  color: var(--vp-c-text-2);
  max-width: 560px;
  line-height: 1.6;
}

.hero-actions {
  margin-top: 2.5rem;
  display: flex;
  gap: 1rem;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.75rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 8px;
  text-decoration: none !important;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.primary-btn {
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  border: 1px solid var(--vp-c-text-1);
}

.primary-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 10px 20px -10px var(--vp-c-text-1);
}

.secondary-btn {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.secondary-btn:hover {
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-text-1);
  transform: translateY(-2px);
}

.arrow-icon {
  width: 18px;
  height: 18px;
  transition: transform 0.3s ease;
}

.primary-btn:hover .arrow-icon {
  transform: translateX(4px);
}

/* Responsive: stack on mobile */
@media (max-width: 860px) {
  .hero-inner {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .content-wrapper {
    align-items: center;
    max-width: 100%;
  }
  .robot-container {
    width: 360px;
    height: 440px;
    margin-top: 2rem;
  }
}

@media (max-width: 640px) {
  .hero-actions {
    flex-direction: column;
    width: 100%;
  }
  .action-btn {
    width: 100%;
  }
  .robot-container {
    width: 300px;
    height: 380px;
  }
}
</style>
