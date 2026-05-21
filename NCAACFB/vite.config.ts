import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        dynasty: 'dynasty/index.html',
        blogger: 'blogger/index.html',
      }
    }
  }
})
