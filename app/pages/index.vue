<template>
  <div class="h-screen w-screen relative bg-black overflow-hidden font-mono selection:bg-indigo-500 selection:text-white">
    
    <!-- Background Layer: Full Screen Charts -->
    <div class="absolute inset-0 z-0">
       <ClientOnly>
          <LayeredCharts />
       </ClientOnly>
    </div>

    <!-- Foreground Layer: Floating Widgets -->
    <div class="absolute top-0 right-0 h-full w-[20vw] min-w-[300px] p-6 flex flex-col gap-6 pointer-events-none z-20">
       
       <!-- Status / Trash Talker Box -->
       <div class="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-2xl pointer-events-auto transition-all hover:border-slate-600/80">
          
          <div class="flex flex-col space-y-3">
             <!-- Status Phrase -->
             <div class="border-l-4 border-indigo-500 pl-3">
               <h1 class="text-xl font-bold uppercase tracking-tight leading-tight text-white/90">
                 {{ moderator.statusPhrase }}
               </h1>
             </div>

             <!-- Target Phrase -->
             <div class="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg">
                <span class="text-rose-400 text-[9px] font-bold uppercase tracking-widest mb-1 block flex items-center gap-1">
                  <span class="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span> Target
                </span>
                <h3 class="text-rose-200 text-sm font-medium leading-snug">{{ moderator.targetPhrase }}</h3>
             </div>
             
             <!-- Footer Info -->
             <div class="flex items-center justify-between pt-2 border-t border-slate-700/50">
                <span class="text-slate-500 text-[10px] uppercase tracking-wider">{{ moderator.timePhrase }}</span>
                <div class="flex items-center gap-1.5">
                   <span class="w-2 h-2 rounded-full" :class="statusColor"></span>
                   <span class="text-[10px] font-bold text-slate-400">{{ store.connectionStatus }}</span>
                </div>
             </div>
          </div>
       </div>

       <!-- Stats Box -->
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

       <div class="flex-grow"></div>
    </div>

  </div>
</template>

<script setup lang="ts">
import LayeredCharts from '~/components/Dashboard/LayeredCharts.vue'
import { ref, computed } from 'vue'
import { useIntervalFn } from '@vueuse/core'
import { useEventStore } from '~/stores/event'

const store = useEventStore()

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
   try {
       const response = await $fetch('/api/moderator', {
           method: 'POST',
           body: {
               stats: {
                   leaderboard: store.leaderboard,
                   total: store.totalCount
               }
           }
       })
       
       if (response) {
           moderator.value = response
       }
   } catch (e) {
       console.error("AI Moderator Offline", e)
   }
}, 10000)

</script>
