import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import typegpu from 'unplugin-typegpu/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/agentic-engineering/',
  plugins: [svelte(), typegpu()],
  optimizeDeps: { exclude: ['@dylanebert/shallot', 'typegpu'] },
  build: { target: 'esnext' },
})
