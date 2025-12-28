<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import { useEventStore } from '~/stores/event'

const store = useEventStore()
await store.init()
</script>
