import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' assert { type: 'json' }

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const fallbackRepositoryPath =
    typeof pkg.name === 'string' ? pkg.name : undefined

  const { process: nodeProcess } = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> }
  }

  const repo =
    nodeProcess?.env?.GITHUB_REPOSITORY?.split('/')?.[1] ??
    fallbackRepositoryPath

  return {
    base: command === 'serve' ? '/' : repo ? `/${repo}/` : '/',
    plugins: [react()],
  }
})

