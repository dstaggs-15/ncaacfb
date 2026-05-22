import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dynasty: resolve(__dirname, 'dynasty/index.html'),
        blogger: resolve(__dirname, 'blogger/index.html'),
      }
    }
  }
})
