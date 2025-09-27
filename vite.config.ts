import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' assert { type: 'json' }

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const fallbackRepositoryPath =
    typeof pkg.name === 'string' ? pkg.name : undefined

  const repo =
    process.env.GITHUB_REPOSITORY?.split('/')?.[1] ?? fallbackRepositoryPath

  return {
    base: command === 'serve' ? '/' : repo ? `/${repo}/` : '/',
    plugins: [react()],
  }
})

