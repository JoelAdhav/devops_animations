import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serves the site at /<repo>/; dev server stays at /
  base: command === 'build' ? '/devops_animations/' : '/',
}))
