<template>
  <div ref="mainScreen" class="h-screen w-screen relative bg-black overflow-hidden font-mono selection:bg-indigo-500 selection:text-white">
    
    <div class="absolute inset-0 z-0">
       <ClientOnly>
          <LayeredCharts />
       </ClientOnly>
    </div>

    <div class="absolute top-0 right-0 h-full w-[20vw] min-w-[300px] p-6 flex flex-col gap-6 pointer-events-none z-20">
       
       <div class="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-2xl pointer-events-auto transition-all hover:border-slate-600/80">
          
          <div class="flex flex-col space-y-3">
             <div class="border-l-4 border-indigo-500 pl-3">
               <h1 class="text-xl font-bold uppercase tracking-tight leading-tight text-white/90">
                 {{ moderator.statusPhrase }}
               </h1>
             </div>

             <div class="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg">
                <span class="text-rose-400 text-[9px] font-bold uppercase tracking-widest mb-1 block flex items-center gap-1">
                  <span class="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span> Target
                </span>
                <h3 class="text-rose-200 text-sm font-medium leading-snug">{{ moderator.targetPhrase }}</h3>
             </div>
             
             <div class="flex items-center justify-between pt-2 border-t border-slate-700/50">
                <span class="text-slate-500 text-[10px] uppercase tracking-wider">{{ moderator.timePhrase }}</span>
                <div class="flex items-center gap-1.5">
                   <span class="w-2 h-2 rounded-full" :class="statusColor"></span>
                   <span class="text-[10px] font-bold text-slate-400">{{ store.connectionStatus }}</span>
                </div>
             </div>
          </div>
       </div>

       <div class="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-2xl pointer-events-auto">
          <div class="grid grid-cols-2 gap-4">
             <div class="flex flex-col">
                <span class="text-slate-500 text-[9px] uppercase font-bold tracking-widest mb-1">Consumed</span>
                <span class="text-3xl font-light text-white tracking-tighter">{{ store.totalCount }}</span>
                <span class="text-slate-600 text-[10px]">Puffers</span>
             </div>
             <div class="flex flex-col">
                <span class="text-slate-500 text-[9px] uppercase font-bold tracking-widest mb-1">Energy</span>
                <span class="text-3xl font-light text-emerald-400 tracking-tighter">{{ (store.totalKcal / 1000).toFixed(1) }}k</span>
                <span class="text-slate-600 text-[10px]">Kcal</span>
             </div>
          </div>
       </div>

       <div class="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-2xl pointer-events-auto flex items-center justify-between">
          <div class="flex flex-col">
             <span class="text-slate-500 text-[9px] uppercase font-bold tracking-widest">Display</span>
             <span class="text-[10px] font-mono" :class="wakeLockActive ? 'text-emerald-400' : 'text-amber-500'">
                {{ wakeLockActive ? 'ALWAYS ON' : 'AUTO SLEEP' }}
             </span>
          </div>
          
          <button 
            @click="toggleFullscreen" 
            class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-[10px] font-bold uppercase text-white transition-colors"
          >
             {{ isFullscreen ? 'Exit Full' : 'Go Full' }}
          </button>
       </div>

       <div class="flex-grow"></div>
    </div>

  </div>
</template>

<script setup lang="ts">
import LayeredCharts from '~/components/Dashboard/LayeredCharts.vue'
import { ref, computed, onMounted, watch } from 'vue'
import { useIntervalFn, useWakeLock, useFullscreen } from '@vueuse/core'
import { useEventStore } from '~/stores/event'

const store = useEventStore()

// --- VueUse: Screen Management ---
const mainScreen = ref<HTMLElement | null>(null)

// 1. Fullscreen
// We bind it to the main wrapper to ensure background covers everything
const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(mainScreen)

// 2. Wake Lock
const { isSupported: isWakeLockSupported, isActive: wakeLockActive, request: requestWakeLock } = useWakeLock()

// Attempt to request Wake Lock on mount or when entering fullscreen
// (Note: Some browsers require a user gesture first, so we also trigger it on the button click)
onMounted(() => {
  if (isWakeLockSupported.value) {
    requestWakeLock().catch(() => console.log('Wake Lock auto-start blocked (awaiting user gesture)'))
  }
})

// Re-request wake lock if we enter fullscreen (user gesture context usually allows this)
watch(isFullscreen, (v) => {
  if (v && isWakeLockSupported.value && !wakeLockActive.value) {
    requestWakeLock()
  }
})

// --- Existing Logic ---

// Connection Status Color
const statusColor = computed(() => {
   if (store.connectionStatus === 'CONNECTED') return 'bg-emerald-500 animate-pulse'
   if (store.connectionStatus === 'CONNECTING') return 'bg-amber-500 animate-pulse'
   return 'bg-red-500'
})

// Mock Moderator State
const moderator = ref({
  statusPhrase: "SYSTEM INITIALIZED",
  targetPhrase: "Awaiting Input...",
  timePhrase: "Phase 1: Warm Up"
})

// Mock AI Update
useIntervalFn(async () => {
  const stats = {
      leaderboard: store.leaderboard,
      total: store.totalCount
  };
  const time = new Date();

  let timePhrase = "Phase: Warm Up";
  if (time.getHours() > 18) timePhrase = "Phase: Evening Feast";
  if (time.getHours() > 20) timePhrase = "Phase: Mid-Game Hunger";
  if (time.getHours() > 22) timePhrase = "Phase: Satiety Critical";
  if (time.getHours() < 4) timePhrase = "Phase: The Last Supper";


  const leaderboard = stats.leaderboard || [];
  const top = leaderboard[0];
  const bottom = leaderboard.length > 1 ? leaderboard[leaderboard.length - 1] : null;

  let status = "Event in progress";
  let target = "Keep eating!";

  if (top) {
      status = `${top.name} is leading with ${top.count} units (${top.velocity} pp30m)`;
  }

  if (bottom) {
      target = `${bottom.name} is lagging behind at ${bottom.velocity} pp30m. Pathetic.`;
  } else if (top && top.count > 20) {
      target = `Is ${top.name} even human? What a machine!`;
  } else if (top && top.count > 10) {
      target = `${top.name} is an absolute beast. Who can stop them?`;
  } else if (top && top.count > 5) {
      target = `${top.name} is on a roll!`;
  }

  moderator.value = {
      statusPhrase: status.toUpperCase(),
      targetPhrase: target,
      timePhrase: timePhrase
  };
}, 5000)

</script>
