import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    // The renderer (the React client) lives in client/, outside src/.
    root: 'client',
    build: {
      rollupOptions: {
        input: resolve('client/index.html')
      }
    },
    plugins: [react()]
  }
})
