import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dynasty: resolve(__dirname, 'dynasty/index.html'),
        dynastyAdd: resolve(__dirname, 'dynasty/add/index.html'),
        dynastySeasons: resolve(__dirname, 'dynasty/seasons/index.html'),
        blogger: resolve(__dirname, 'blogger/index.html'),
      }
    }
  }
})
