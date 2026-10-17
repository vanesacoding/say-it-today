import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: '叽咕一下 · 亲子分级共读',
        short_name: '叽咕一下',
        description: '精选分级英文绘本，原版真人朗读与轻量亲子共读。',
        theme_color: '#faf7f0',
        background_color: '#faf7f0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp,woff2,mp3}'],
        globIgnores: ['images/**/*', 'design-demos/**/*', 'books/library/**/*'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [{
          urlPattern: /\/books\/library\/.*\.(jpg|png|mp3)$/,
          handler: 'CacheFirst',
          options: {cacheName: 'jigu-book-media-v2', expiration: {maxEntries: 450, maxAgeSeconds: 365 * 24 * 60 * 60}, rangeRequests: true}
        }]
      }
    })
  ]
})
