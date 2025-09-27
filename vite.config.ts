import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repositoryPath = process.env.GITHUB_REPOSITORY?.split('/')[1]

// https://vite.dev/config/
export default defineConfig({
  base: repositoryPath ? `/${repositoryPath}/` : '/',
  plugins: [react()],
})
