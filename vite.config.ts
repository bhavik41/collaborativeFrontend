import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist'
  },
  base: '/',
  server: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin"
    },

    // proxy: {
    //   '/cdn': {
    //     target: 'http://localhost:3006',
    //     changeOrigin: true,
    //     secure: false
    //   }
    // }
  }
})
