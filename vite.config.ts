import path from 'path'
import fs from 'fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

/**
 * Vite plugin: copies dist/index.html → dist/404.html after every build.
 *
 * Vercel's static-file service uses 404.html as the SPA fallback for any URL
 * that does not match a physical file in the build output. Without this file,
 * reloading on a client-side route such as /dashboard/documents causes Vercel
 * to return a 404 NOT_FOUND response.
 */
function spaFallbackPlugin(): Plugin {
  return {
    name: 'spa-fallback',
    closeBundle() {
      const src = path.resolve(__dirname, 'dist/index.html')
      const dest = path.resolve(__dirname, 'dist/404.html')
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest)
        console.log('✓ Copied dist/index.html → dist/404.html (SPA fallback)')
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), spaFallbackPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
