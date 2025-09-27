import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => {
  const repo = 'exo-ui'
  return {
    base: command === 'serve' ? '/' : `/${repo}/`,
    plugins: [react()],
  }
})
