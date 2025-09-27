import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => {
  const repo = process.env.GITHUB_REPOSITORY?.split('/')?.[1] ?? 'exo-ui'
  return {
    base: command === 'serve' ? '/' : `/${repo}/`,
    plugins: [react()],
  }
})
