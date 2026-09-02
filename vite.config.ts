import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  base: '/agentic-engineering/',
  plugins: [svelte()],
  build: { target: 'esnext' },
})
