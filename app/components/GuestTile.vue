<template>
  <div 
    ref="el" 
    class="guest-tile w-[110px] h-[140px] absolute z-10 touch-none bg-black border flex flex-col transition-transform will-change-transform font-mono shadow-xl group select-none" 
    :class="[
      recommendationClasses,
      isLongPressed ? 'z-50 scale-110 cursor-grabbing' : 'z-10 scale-100 cursor-grab',
      guest.status !== 'active' ? 'opacity-40 grayscale border-dashed border-gray-700' : 'bg-gray-900/50'
    ]"
    :style="{ left: localX + 'px', top: localY + 'px' }"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerUp"
    @contextmenu.prevent
  >
    <!-- Visual Feedback for Long Press -->
    <div v-if="isLongPressed" class="absolute -top-4 left-1/2 -translate-x-1/2 bg-tech-accent text-black text-[9px] font-bold px-2 py-0.5 rounded-full z-50 animate-pulse whitespace-nowrap shadow-[0_0_10px_rgba(0,255,65,0.8)]">
      {{ hasMoved ? 'DRAGGING' : 'RELEASE FOR MENU' }}
    </div>

    <!-- Corner Decorations -->
    <div class="absolute top-0 left-0 w-1 h-1 bg-white opacity-20 group-hover:opacity-100 transition-opacity"></div>
    <div class="absolute top-0 right-0 w-1 h-1 bg-white opacity-20 group-hover:opacity-100 transition-opacity"></div>
    <div class="absolute bottom-0 left-0 w-1 h-1 bg-white opacity-20 group-hover:opacity-100 transition-opacity"></div>
    <div class="absolute bottom-0 right-0 w-1 h-1 bg-white opacity-20 group-hover:opacity-100 transition-opacity"></div>

    <div class="p-2 flex flex-col justify-between h-full w-full relative z-10">
      
      <!-- Header: Name & Undo -->
      <div class="flex justify-between items-start mb-1">
        <small class="font-bold truncate max-w-[70px] text-gray-300 text-[10px] uppercase tracking-wider leading-tight pointer-events-none">{{ guest.name }}</small>
        <!-- Stop propagation on buttons -->
        <button @click.stop="emit('undo', guest.id)" @pointerdown.stop class="text-red-500 hover:text-red-400 px-1 -mt-1 -mr-1 text-[10px] hover:bg-red-900/30 transition-colors z-20">[ - ]</button>
      </div>

      <!-- Main Action: Count -->
      <div 
        class="flex-grow flex items-center justify-center bg-black border border-gray-800 my-1 hover:border-tech-accent hover:shadow-[0_0_10px_rgba(0,255,65,0.2)] active:bg-tech-accent/10 transition-all cursor-pointer relative overflow-hidden z-20"
        @click.stop="emit('add', guest.id)"
        @pointerdown.stop
      >
        <div class="absolute top-0 left-0 w-full h-[1px] bg-white/10 animate-[scan_2s_linear_infinite] pointer-events-none"></div>
        <h2 class="m-0 text-white text-3xl font-bold select-none tracking-tighter">{{ guest.count }}</h2>
      </div>

      <!-- Status Footer -->
      <div class="flex justify-center pointer-events-none">
        <span v-if="guest.status === 'paused'" class="px-1 py-0.5 text-[9px] uppercase font-bold bg-yellow-900/30 text-yellow-500 border border-yellow-700/50 w-full text-center tracking-tight">⚠ PAUSED</span>
        <span v-else-if="guest.status === 'ko'" class="px-1 py-0.5 text-[9px] uppercase font-bold bg-red-900/30 text-red-500 border border-red-700/50 w-full text-center tracking-tight">✖ KO</span>
        <small v-else class="text-gray-600 text-[9px] font-bold tracking-widest">{{ timeSinceLast }}</small>
      </div>

    </div>

    <!-- Menu Modal (Visible on Long Press + Release) -->
    <div v-if="showMenu" class="absolute inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-1 gap-1 border border-tech-accent" @pointerdown.stop>
      <button @click.stop="setStatus('paused')" class="w-full py-1 text-[10px] font-bold bg-yellow-900/40 text-yellow-400 border border-yellow-700 hover:bg-yellow-900 uppercase">Pause 10m</button>
      <button @click.stop="setStatus('ko')" class="w-full py-1 text-[10px] font-bold bg-red-900/40 text-red-400 border border-red-700 hover:bg-red-900 uppercase">Terminate</button>
      <button @click.stop="setStatus('active')" class="w-full py-1 text-[10px] font-bold bg-green-900/40 text-green-400 border border-green-700 hover:bg-green-900 uppercase">Resume</button>
      <button @click.stop="showMenu = false" class="w-full py-1 text-[10px] font-bold bg-gray-900 text-gray-400 border border-gray-700 hover:bg-gray-800 uppercase">Exit</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTimeAgo } from '@vueuse/core'
import type { Guest } from '~/stores/event'

const props = defineProps<{
  guest: Guest,
  recommendationRank: number
}>()

const emit = defineEmits(['add', 'undo', 'update:position', 'set-status'])

const el = ref<HTMLElement | null>(null)
const showMenu = ref(false)

// Local State for smooth dragging
const localX = ref(props.guest.x)
const localY = ref(props.guest.y)

// Interaction State
const isInteracting = ref(false) // Pointer is down
const isLongPressed = ref(false) // Timer fired
const hasMoved = ref(false) // Moved since Long Press
let longPressTimer: any = null
let startPointerX = 0
let startPointerY = 0
let startElemX = 0
let startElemY = 0

// Sync with store when NOT interacting
watch(() => props.guest.x, (newX) => { if (!isInteracting.value) localX.value = newX })
watch(() => props.guest.y, (newY) => { if (!isInteracting.value) localY.value = newY })

const timeSinceLast = useTimeAgo(computed(() => props.guest.lastPufferTime || Date.now()))

const recommendationClasses = computed(() => {
  if (props.recommendationRank === -1) return 'border-gray-800'
  if (props.recommendationRank === 0) return 'border-yellow-400 border-[6px] shadow-[0_0_30px_rgba(250,204,21,0.6)] bg-yellow-900/20'
  if (props.recommendationRank === 1) return 'border-yellow-500/80 border-2 shadow-[0_0_10px_rgba(234,179,8,0.2)]'
  if (props.recommendationRank <= 3) return 'border-yellow-600/60 border'
  return 'border-yellow-700/30 border'
})

// --- Custom Pointer Logic ---

function handlePointerDown(e: PointerEvent) {
  if (showMenu.value) return 
  
  isInteracting.value = true
  isLongPressed.value = false
  hasMoved.value = false
  
  startPointerX = e.clientX
  startPointerY = e.clientY
  startElemX = localX.value
  startElemY = localY.value
  
  // Do NOT capture yet. Allow scrolling.

  longPressTimer = setTimeout(() => {
    isLongPressed.value = true
    // NOW capture to steal from scroll
    const target = e.target as HTMLElement
    if (target && target.setPointerCapture) {
        target.setPointerCapture(e.pointerId)
    }
    if (navigator.vibrate) navigator.vibrate(50)
  }, 400)
}

function handlePointerMove(e: PointerEvent) {
  if (!isInteracting.value) return

  if (!isLongPressed.value) {
    const dist = Math.sqrt(Math.pow(e.clientX - startPointerX, 2) + Math.pow(e.clientY - startPointerY, 2))
    if (dist > 10) {
      // Moved before long press -> Scrolling. Cancel drag logic.
      clearTimeout(longPressTimer)
      isInteracting.value = false // Stop tracking this gesture
    }
    return
  }

  hasMoved.value = true
  const deltaX = e.clientX - startPointerX
  const deltaY = e.clientY - startPointerY
  localX.value = startElemX + deltaX
  localY.value = startElemY + deltaY
}

function handlePointerUp(e: PointerEvent) {
  clearTimeout(longPressTimer)
  
  // Release capture if we had it
  if (isLongPressed.value) {
      const target = e.target as HTMLElement
      if (target && target.releasePointerCapture) {
          target.releasePointerCapture(e.pointerId)
      }
  }
  
  if (isLongPressed.value) {
    if (!hasMoved.value) {
      showMenu.value = true
    } else {
      emit('update:position', { id: props.guest.id, x: localX.value, y: localY.value })
    }
  }

  isInteracting.value = false
  isLongPressed.value = false
  hasMoved.value = false
}

const setStatus = (status: string) => {
  emit('set-status', { id: props.guest.id, status })
  showMenu.value = false
}

</script>

<style scoped>
@keyframes scan {
  0% { transform: translateY(-10px); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateY(50px); opacity: 0; }
}
</style>
