import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('motion')) {
              return 'vendor-motion';
            }
            if (id.includes('gsap')) {
              return 'vendor-gsap';
            }
            if (id.includes('@tsparticles')) {
              return 'vendor-particles';
            }
            if (id.includes('dockview')) {
              return 'vendor-dockview';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
          }
        },
      },
    },
  },
})

