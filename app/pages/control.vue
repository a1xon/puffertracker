<template>
  <div class="h-screen w-screen flex flex-col bg-black overflow-hidden font-mono">
    <!-- Navbar -->
    <nav class="flex items-center justify-between bg-tech-surface border-b border-tech-border px-4 py-3 z-50 shadow-md relative shrink-0">
      <span class="text-xl font-bold text-tech-accent tracking-tighter uppercase">Puffer<span class="text-white">Tracker</span></span>
      <div class="flex items-center gap-3">
        <button @click="showResetModal = true" class="px-3 py-1 text-xs font-bold bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-900/40 transition-colors uppercase">
          [!] Reset
        </button>
        <button v-if="store.guests.length === 0" @click="store.seedGuests()" class="px-3 py-1 text-xs font-bold bg-yellow-900/30 text-yellow-400 border border-yellow-800 hover:bg-yellow-800/50 transition-colors uppercase animate-pulse">
          ⚡ Seed System
        </button>
        <button @click="showAddModal = true" class="px-3 py-1 text-xs font-bold bg-tech-surface text-tech-accent border border-tech-accent/50 hover:bg-tech-accent/10 transition-colors uppercase">
          [+] Add
        </button>
        <NuxtLink to="/" class="px-3 py-1 text-xs font-bold bg-tech-surface text-cyan-400 border border-cyan-800 hover:bg-cyan-900/30 transition-colors uppercase">
          > View
        </NuxtLink>
      </div>
    </nav>

    <!-- Scrollable Vertical Playground -->
    <div class="flex-grow relative w-full h-full overflow-y-auto overflow-x-hidden bg-black/90 scroll-smooth">
       <!-- Dynamic Height Container -->
       <div class="relative w-full" :style="{ minHeight: ((rowCount * 160) + 200) + 'px' }" ref="playground">
          
          <!-- Visual Grid System (Background) -->
          <div class="absolute inset-0 pointer-events-none">
             <!-- Central Axis -->
             <div class="absolute left-1/2 top-0 bottom-0 w-[2px] bg-gray-800/50 -ml-[1px]"></div>
             
             <!-- Dynamic Slots -->
             <template v-for="i in rowCount" :key="i">
                 <!-- Left Slot (Even indices: 0, 2, 4...) -->
                 <div class="absolute left-[20px] w-[110px] h-[140px] border-2 border-dashed border-gray-800 rounded-xl flex items-center justify-center"
                      :style="{ top: (80 + (i-1)*160) + 'px' }">
                      <span class="text-gray-800 text-xs font-bold">{{ (i-1)*2 }}</span>
                 </div>

                 <!-- Right Slot (Odd indices: 1, 3, 5...) -->
                 <div class="absolute left-[200px] w-[110px] h-[140px] border-2 border-dashed border-gray-800 rounded-xl flex items-center justify-center"
                      :style="{ top: (80 + (i-1)*160) + 'px' }">
                      <span class="text-gray-800 text-xs font-bold">{{ (i-1)*2 + 1 }}</span>
                 </div>
             </template>
          </div>

          <!-- Guests -->
          <GuestTile
            v-for="guest in store.guests"
            :key="guest.id"
            :guest="guest"
            :recommendation-rank="getRecommendationRank(guest.id)"
            @add="store.addPuffer(guest.id)"
            @undo="store.undoPuffer(guest.id)"
            @update:position="(pos) => store.snapToGrid(pos.id, pos.x, pos.y)"
            @set-status="(payload) => store.setGuestStatus(payload.id, payload.status)"
          />
       </div>
    </div>

    <!-- Reset Confirmation Modal -->
    <div v-if="showResetModal" class="absolute inset-0 bg-red-950/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div class="bg-black border-2 border-red-600 p-8 w-full max-w-sm shadow-[0_0_50px_rgba(220,38,38,0.3)] relative text-center">
        <h2 class="text-3xl font-black mb-2 text-red-500 uppercase tracking-tighter">Danger Zone</h2>
        <p class="text-gray-400 text-sm mb-8 uppercase font-bold">This will permanently delete all participants, logs, and reset the clock. This cannot be undone.</p>
        
        <div class="flex flex-col gap-4">
          <button 
            @click="handleReset" 
            class="py-4 bg-red-600 text-white font-black uppercase text-lg hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all"
          >
            Confirm Wipe
          </button>
          <button @click="showResetModal = false" class="py-2 text-gray-500 uppercase text-xs font-bold hover:text-white transition-colors">
            Abort Mission
          </button>
        </div>
      </div>
    </div>

    <!-- Add Guest Modal -->
    <div v-if="showAddModal" class="absolute inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div class="bg-black border border-tech-accent p-6 w-full max-w-sm shadow-[0_0_30px_rgba(0,255,65,0.1)] relative">
        <h2 class="text-xl font-bold mb-6 text-white uppercase tracking-widest border-b border-gray-800 pb-2">New Unit</h2>
        
        <div class="mb-4">
          <input v-model="newGuestName" type="text" class="w-full bg-gray-900 border border-gray-700 p-3 text-white focus:outline-none focus:border-tech-accent font-mono placeholder-gray-700" placeholder="ENTER NAME..." />
        </div>
        
        <div class="mb-6 flex gap-4">
            <button @click="newGuestGender = 'm'" class="flex-1 py-3 border transition-all uppercase text-xs font-bold" :class="newGuestGender === 'm' ? 'bg-blue-900/20 border-blue-500 text-blue-400' : 'bg-transparent border-gray-800 text-gray-600'">Male</button>
            <button @click="newGuestGender = 'f'" class="flex-1 py-3 border transition-all uppercase text-xs font-bold" :class="newGuestGender === 'f' ? 'bg-pink-900/20 border-pink-500 text-pink-400' : 'bg-transparent border-gray-800 text-gray-600'">Female</button>
        </div>

        <div class="flex gap-4">
          <button @click="showAddModal = false" class="flex-1 py-3 bg-transparent border border-gray-700 text-gray-400 uppercase text-xs font-bold">Cancel</button>
          <button @click="addGuest" class="flex-1 py-3 bg-tech-accent text-black font-bold uppercase text-xs hover:bg-green-400">Confirm</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEventStore } from '~/stores/event'
import { useIntervalFn } from '@vueuse/core'

const store = useEventStore()

const showAddModal = ref(false)
const showResetModal = ref(false)
const newGuestName = ref('')
const newGuestGender = ref<'m' | 'f'>('m')

const rowCount = computed(() => {
    // Calculate needed rows. 16 guests -> 8 rows. 
    // Always add 1 buffer row.
    // Guests = store.guests.length
    // Seats = Guests
    // Rows = Ceil(Seats / 2)
    return Math.max(8, Math.ceil((store.guests.length + 2) / 2))
})

function getRecommendationRank(id: string) {
  const queue = store.recommendationQueue
  const index = queue.findIndex(g => g.id === id)
  return index // 0-5, or -1
}

async function addGuest() {
  if (!newGuestName.value.trim()) return
  await store.addParticipant(newGuestName.value, newGuestGender.value)
  newGuestName.value = ''
  showAddModal.value = false
}

async function handleReset() {
  await store.resetEvent()
  showResetModal.value = false
}

useIntervalFn(() => {
  store.checkPauseTimers()
}, 1000)

</script>