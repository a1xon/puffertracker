<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useEventStore } from '~/stores/event'

const store = useEventStore()

onMounted(() => {
  store.init()
})
</script>
