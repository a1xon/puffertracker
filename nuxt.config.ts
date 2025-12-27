// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/supabase'
  ],
  css: ['~/assets/css/main.css'],
  supabase: {
    redirect: false // Disable built-in auth redirect as we have public access
  },
  app: {
    head: {
      title: 'Puffertracker',
      bodyAttrs: {
        class: 'bg-black text-white overflow-hidden font-mono' // Global Dark Mode
      },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0' } // Prevent zoom on mobile
      ]
    }
  }
})