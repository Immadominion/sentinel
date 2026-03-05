<template>
  <div class="hero-container" @mousemove="handleMouseMove">
    <!-- Grid overlay for technical feel -->
    <div class="bg-grid"></div>
    
    <!-- Dynamic glow element following mouse -->
    <div 
      class="glow-orb" 
      :style="{ transform: `translate(${mouseX * 0.05}px, ${mouseY * 0.05}px)` }"
    ></div>

    <div class="content-wrapper">
      <div class="badge-wrapper" ref="badgeRef">
        <span class="badge">v0.1.0-alpha • Deployed on Devnet</span>
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
        <a href="https://github.com/immadominion/sentinel" class="action-btn secondary-btn" target="_blank" rel="noopener">
          View on GitHub
        </a>
      </div>
    </div>
    
    <!-- Real 3D Canvas via Spline -->
    <div class="spline-container" ref="splineContainerRef">
      <canvas ref="canvasRef"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Application } from '@splinetool/runtime'
import gsap from 'gsap'

const titleRef = ref(null)
const taglineRef = ref(null)
const actionsRef = ref(null)
const badgeRef = ref(null)

const canvasRef = ref(null)
const splineContainerRef = ref(null)

const mouseX = ref(0)
const mouseY = ref(0)

const handleMouseMove = (e) => {
  const { clientX, clientY, innerWidth, innerHeight } = window
  // Calculate relative to center
  mouseX.value = clientX - innerWidth / 2
  mouseY.value = clientY - innerHeight / 2
}

onMounted(async () => {
  // Initialize GSAP Timeline
  const tl = gsap.timeline()
  
  // Set initial states
  gsap.set([badgeRef.value, titleRef.value, taglineRef.value, actionsRef.value, splineContainerRef.value], { 
    y: 30, 
    autoAlpha: 0 
  })

  tl.to(badgeRef.value, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out' })
    .to(titleRef.value, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out' }, '-=0.6')
    .to(taglineRef.value, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out' }, '-=0.6')
    .to(actionsRef.value, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out' }, '-=0.6')
    .to(splineContainerRef.value, { y: 0, autoAlpha: 1, duration: 1.5, ease: 'power2.out' }, '-=0.4')

  // Initialize Spline Application
  if (canvasRef.value) {
    const app = new Application(canvasRef.value)
    // Using a sample technical/abstract Spline design
    // The link below is a public Spline URL showing an abstract glass/metal shape suitable for "Web3 Infrastructure"
    await app.load('https://prod.spline.design/Q7k7y5uE7J273V4p/scene.splinecode')
  }
})
</script>

<style scoped>
.hero-container {
  position: relative;
  min-height: calc(100vh - var(--vp-nav-height));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 4rem 2rem;
  perspective: 1000px;
  color: var(--vp-c-text-1);
}

.bg-grid {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-size: 50px 50px;
  background-image: linear-gradient(to right, var(--vp-c-divider) 1px, transparent 1px),
                    linear-gradient(to bottom, var(--vp-c-divider) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
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

.content-wrapper {
  position: relative;
  z-index: 10;
  max-width: 900px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none; /* Let clicks pass through to 3D canvas where there's no text */
}

/* Re-enable pointer events for actual interactive text/buttons */
.content-wrapper > * {
  pointer-events: auto;
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
  font-size: clamp(3rem, 6vw, 5.5rem);
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
  font-size: clamp(1.1rem, 2vw, 1.4rem);
  color: var(--vp-c-text-2);
  max-width: 700px;
  line-height: 1.6;
}

.hero-actions {
  margin-top: 3rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
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

/* 3D Spline Canvas Container */
.spline-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1; /* Behind text, above grid */
  pointer-events: auto; /* Allow interacting with 3D model */
  opacity: 0.8;
  mix-blend-mode: color-dodge;
}

html.dark .spline-container {
  opacity: 0.5;
  mix-blend-mode: screen;
}

.spline-container canvas {
  width: 100% !important;
  height: 100% !important;
  outline: none;
}

@media (max-width: 640px) {
  .hero-actions {
    flex-direction: column;
    width: 100%;
  }
  .action-btn {
    width: 100%;
  }
}
</style>
