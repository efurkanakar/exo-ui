import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import packageJson from './package.json' assert { type: 'json' }

declare const process: {
  env: Record<string, string | undefined>
}

const fallbackRepositoryPath = typeof packageJson.name === 'string' ? packageJson.name : undefined
const repositoryPath = process.env.GITHUB_REPOSITORY?.split('/')[1]

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const repositoryPath =
    process.env.GITHUB_REPOSITORY?.split('/')?.[1] ?? fallbackRepositoryPath

  return {
    base: command === 'serve' ? '/' : repositoryPath ? `/${repositoryPath}/` : '/',
    plugins: [react()],
  }
})
