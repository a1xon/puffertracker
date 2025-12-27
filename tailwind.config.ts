import type { Config } from 'tailwindcss'

export default <Config>{
  content: [
    "./app/components/**/*.{js,vue,ts}",
    "./app/layouts/**/*.vue",
    "./app/pages/**/*.vue",
    "./app/plugins/**/*.{js,ts}",
    "./app/app.vue",
    "./app/error.vue",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrainsMono', 'monospace'],
      },
      colors: {
        'tech-bg': '#050505',
        'tech-surface': '#0a0a0a',
        'tech-border': '#333333',
        'tech-accent': '#00ff41', // Matrix Green
        'tech-accent-2': '#00b8ff', // Cyber Blue
      }
    },
  },
  plugins: [],
}
