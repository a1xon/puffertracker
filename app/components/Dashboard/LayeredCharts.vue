<template>
  <div class="relative w-full h-full bg-black">
    <!-- Bottom Layer: Line Chart (History) -->
    <div class="absolute inset-0 z-0 w-full h-full">
      <Line :data="lineData" :options="lineOptions" />
    </div>

    <!-- Top Layer: Bar Chart (Leaderboard) -->
    <div class="absolute top-10 left-10 bottom-10 z-10 w-[35vw] pointer-events-none opacity-95">
      <Bar :data="barData" :options="barOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  BarElement,
  PointElement,
  CategoryScale,
  LinearScale,
  TimeScale,
  Filler
} from 'chart.js'
import { Line, Bar } from 'vue-chartjs'
import { useEventStore } from '~/stores/event'
import 'chartjs-adapter-date-fns'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
)

const store = useEventStore()

const summaryColors = [
  "#FF8C44", "#A45A32", "#D4BA14", "#7D7F23", 
  "#8DCE29", "#3F8848", "#1FD695", "#008B7D", 
  "#00D6FA", "#3180C3", "#8EC2FF", "#666FAB", 
  "#E39AFF", "#975E9D", "#FF7EC3", "#BC526E"
];

function getColorForGuest(id: string) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % summaryColors.length;
    return summaryColors[index];
}

const lineData = computed(() => {
  const guests = store.guests
  const logs = store.logs
  const startTime = store.startTime
  const now = Date.now()
  
  const datasets = guests.map(guest => {
    const guestLogs = logs.filter(l => l.guestId === guest.id).sort((a, b) => a.timestamp - b.timestamp)
    const data = [{x: startTime, y: 0}]
    let runningTotal = 0
    
    guestLogs.forEach(log => {
        runningTotal += 1
        data.push({ x: log.timestamp, y: runningTotal })
    })
    data.push({ x: now, y: runningTotal })

    return {
      label: guest.name,
      data: data,
      borderColor: getColorForGuest(guest.id),
      backgroundColor: 'transparent',
      tension: 0, // No curves
      stepped: true, // Incremental steps
      pointRadius: 0,
      borderWidth: 2,
      order: 2
    }
  })

  // Global Total Line
  const globalData = [{x: startTime, y: 0}]
  const sortedLogs = [...logs].sort((a,b) => a.timestamp - b.timestamp)
  let globalTotal = 0
  sortedLogs.forEach(log => {
      globalTotal += 1
      globalData.push({ x: log.timestamp, y: globalTotal })
  })
  globalData.push({ x: now, y: globalTotal })

  datasets.push({
      label: 'TOTAL',
      data: globalData,
      borderColor: '#FFFFFF',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      fill: true,
      tension: 0,
      stepped: true,
      pointRadius: 0,
      borderWidth: 4,
      order: 1,
      yAxisID: 'y1' 
  } as any)

  return { datasets }
})

const lineOptions = computed(() => {
    const now = Date.now()
    const elapsed = now - store.startTime
    const oneHour = 60 * 60 * 1000
    
    let limitDuration = 30 * 60000
    if (elapsed > 30 * 60000) limitDuration = oneHour
    if (elapsed > oneHour) limitDuration = 2 * oneHour
    if (elapsed > 2 * oneHour) limitDuration = 3 * oneHour
    if (elapsed > 3 * oneHour) limitDuration = Math.ceil(elapsed / oneHour) * oneHour
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { 
          type: 'time',
          time: { unit: 'minute', displayFormats: { minute: 'HH:mm' } },
          min: store.startTime,
          max: store.startTime + limitDuration,
          grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
          ticks: { color: '#64748B', font: { family: 'JetBrainsMono' } }
        }, 
        y: { 
            display: true,
            position: 'right',
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94A3B8', font: { family: 'JetBrainsMono' } },
            title: { display: true, text: 'Puffers', color: '#64748B' }
        },
        y1: {
            display: true,
            position: 'left',
            grid: { display: false }, 
            ticks: { color: '#FFFFFF', font: { family: 'JetBrainsMono', weight: 'bold' } },
            title: { display: true, text: 'Total Units', color: '#FFFFFF' }
        }
      },
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { duration: 0 }
    }
})

const barData = computed(() => {
  const sorted = [...store.guests].sort((a, b) => b.count - a.count).slice(0, 10)
  
  return {
    labels: sorted.map(g => {
        const weight = g.count * store.unitWeight
        const kcal = g.count * store.unitKcal
        // Format: Name (Velocity) [Count | Weightg | Kcal]
        return `${g.name} (${g.velocity} pp30m) [${g.count} | ${weight}g | ${kcal}kcal]`
    }),
    datasets: [{
      label: 'Count',
      data: sorted.map(g => g.count),
      backgroundColor: sorted.map(g => getColorForGuest(g.id) + 'CC'),
      borderColor: 'transparent',
      borderWidth: 0,
      barThickness: 20,
      borderRadius: 4
    }]
  }
})

const barOptions = {
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: { display: false }, 
    y: { 
        display: true,
        ticks: { 
            color: '#F8FAFC', // Slate 50 (Brighter for readability)
            font: { size: 14, family: 'JetBrainsMono', weight: 'bold' },
            padding: 10
        },
        grid: { display: false },
        border: { display: false }
    }
  },
  plugins: { legend: { display: false } }
}
</script>