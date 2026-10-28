import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'jigu-icon-64.png', 'jigu-apple-180.png'],
      manifest: {
        name: '叽咕一会 · 绘本与闪卡',
        short_name: '叽咕一会',
        description: '英文绘本与牛津闪卡，亲子共读、听音找卡、轻松启蒙。',
        theme_color: '#faf7f0',
        background_color: '#faf7f0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'jigu-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'jigu-icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'jigu-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp,woff2,mp3}'],
        globIgnores: ['images/**/*', 'design-demos/**/*', 'books/library/**/*', 'flashcards/oxford/images/**/*', 'flashcards/oxford/audio/**/*', 'flashcards/supplement/**/*', 'phonics/media/**/*'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [{
          urlPattern: /\/(?:books\/library|flashcards\/oxford\/(?:images|audio)|flashcards\/supplement|phonics\/media)\/.*\.(jpg|png|webp|mp3)$/,
          handler: 'CacheFirst',
          options: {cacheName: 'jigu-book-media-v2', expiration: {maxEntries: 450, maxAgeSeconds: 365 * 24 * 60 * 60}, rangeRequests: true}
        }]
      }
    })
  ]
})
