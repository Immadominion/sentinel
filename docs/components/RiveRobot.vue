<template>
  <div
    class="rive-robot-wrapper"
    ref="wrapperRef"
    @mouseenter="onHover(true)"
    @mouseleave="onHover(false)"
  >
    <canvas ref="canvasRef" class="rive-canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref(null)
const wrapperRef = ref(null)
let riveInstance = null
let fireInput = null
let skinInput = null
let resizeObserver = null

function onHover(entering) {
  if (!fireInput) return
  // Trigger-type inputs use .fire(), boolean inputs use .value
  if (typeof fireInput.fire === 'function') {
    if (entering) fireInput.fire()
  } else {
    fireInput.value = entering
  }
}

function resizeCanvas() {
  const canvas = canvasRef.value
  const wrapper = wrapperRef.value
  if (!canvas || !wrapper) return

  const dpr = window.devicePixelRatio || 1
  const rect = wrapper.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  canvas.style.width = rect.width + 'px'
  canvas.style.height = rect.height + 'px'

  if (riveInstance) {
    riveInstance.resizeDrawingSurfaceToCanvas()
  }
}

function wireUpInputs() {
  if (!riveInstance) return

  // The .riv file has SM named "Motion" with 2 inputs
  const smName = 'Motion'
  let inputs = null

  try {
    inputs = riveInstance.stateMachineInputs(smName)
  } catch (e) {
    console.warn('[RiveRobot] Failed to get inputs for SM "Motion":', e)
  }

  if (!inputs || inputs.length === 0) {
    console.warn('[RiveRobot] No inputs returned for SM "Motion"')
    return
  }

  console.log(`[RiveRobot] SM "${smName}" inputs:`, inputs.map(i => `${i.name} (type=${i.type})`))

  // Bind ALL inputs by examining each one
  for (const input of inputs) {
    const name = input.name.toLowerCase()

    // Fire/shoot/action trigger
    if (/fire|shoot|attack|trigger|blast|action|tap|click|press|fly/i.test(input.name)) {
      fireInput = input
      console.log('[RiveRobot] Bound fire input:', input.name, 'type:', input.type)
    }
    // Skin/variant number input
    else if (/skin|variant|color|type|character|style|outfit|num/i.test(input.name)) {
      skinInput = input
      const randomSkin = Math.floor(Math.random() * 3)
      skinInput.value = randomSkin
      console.log('[RiveRobot] Skin set to:', randomSkin)
    }
  }

  // Fallback: if regex didn't match, assign by position
  // (2 inputs — likely one is the trigger for fire, one is skin number)
  if (!fireInput && !skinInput && inputs.length >= 2) {
    console.log('[RiveRobot] Regex did not match, assigning by position')
    for (const input of inputs) {
      // type 56 = trigger, type 59 = number, type 58 = boolean (Rive internal enum)
      if (typeof input.fire === 'function' && !fireInput) {
        fireInput = input
        console.log('[RiveRobot] Trigger input (by type):', input.name)
      } else if (!skinInput) {
        skinInput = input
        const randomSkin = Math.floor(Math.random() * 3)
        skinInput.value = randomSkin
        console.log('[RiveRobot] Number input (by type) set skin to:', randomSkin)
      }
    }
  }

  // Last resort: if we still have nothing, just assign first as fire
  if (!fireInput && inputs.length >= 1) {
    fireInput = inputs[0]
    console.log('[RiveRobot] Fallback: bound first input as fire:', inputs[0].name)
  }
  if (!skinInput && inputs.length >= 2) {
    skinInput = inputs[1]
    const randomSkin = Math.floor(Math.random() * 3)
    skinInput.value = randomSkin
    console.log('[RiveRobot] Fallback: bound second input as skin:', inputs[1].name, '=', randomSkin)
  }
}

onMounted(async () => {
  if (typeof window === 'undefined') return
  const rive = await import('@rive-app/canvas')
  const { Rive, Layout, Fit, Alignment } = rive

  const canvas = canvasRef.value
  if (!canvas) return

  // Initial canvas size
  resizeCanvas()

  riveInstance = new Rive({
    src: '/fly-agent.riv',
    canvas,
    autoplay: true,
    stateMachines: 'Motion',
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center
    }),
    onLoad: () => {
      console.log('[RiveRobot] File loaded successfully')
      resizeCanvas()

      // First try: wire up immediately (works when SM is specified)
      wireUpInputs()
    },
    onPlay: (event) => {
      // Second try: wire up when animation actually starts playing
      // This fires after the state machine is fully initialized
      console.log('[RiveRobot] Playing:', event)
      if (!fireInput && !skinInput) {
        wireUpInputs()
      }
    },
    onStateChange: (event) => {
      console.log('[RiveRobot] State changed:', event?.data)
    }
  })

  // Keep canvas in sync with container size
  resizeObserver = new ResizeObserver(() => resizeCanvas())
  if (wrapperRef.value) {
    resizeObserver.observe(wrapperRef.value)
  }
})

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (riveInstance) {
    riveInstance.cleanup()
    riveInstance = null
  }
})
</script>

<style scoped>
.rive-robot-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: visible;
}

.rive-canvas {
  display: block;
}
</style>
