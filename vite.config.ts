import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Расходы в Таиланде',
        short_name: 'Расходы',
        lang: 'ru',
        display: 'standalone',
        theme_color: '#12372a',
        background_color: '#f6f2e8',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    exclude: ['**/node_modules/**', 'e2e/**'],
  },
})
