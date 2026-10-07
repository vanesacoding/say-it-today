import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import generateCardsHandler from './api/generate-cards'

function localApi(): Plugin {
  return {
    name: 'local-doubao-api',
    configureServer(server) {
      server.middlewares.use('/api/generate-cards', async (req, res) => {
        let body = ''
        for await (const chunk of req) body += chunk
        const adapter = {
          status(code: number) { res.statusCode = code; return adapter },
          json(value: unknown) { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value)) }
        }
        try { await generateCardsHandler({ method: req.method, body: body ? JSON.parse(body) : undefined }, adapter) }
        catch { adapter.status(400).json({ error: 'invalid_request' }) }
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    base: process.env.VITE_BASE_PATH || '/',
    server: { allowedHosts: ['terminal.local'] },
    build: { rollupOptions: { output: { manualChunks(id) {
      if (id.includes('/data/visualAssets.json')) return 'existing-fruit-recordings'
      if (id.includes('/data/fruits-media.json')) return 'fruits-media'
      if (id.includes('/data/vegetables-media.json')) return 'vegetables-media'
      if (id.includes('/data/kitchen-media.json')) return 'kitchen-media'
    } } } },
    plugins: [
    react(),
    localApi(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: '今天怎么说 · Say It Today',
        short_name: '今天怎么说',
        description: '把想说的话，变成真正会说的英语。',
        theme_color: '#f5f0e8',
        background_color: '#f5f0e8',
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
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp,mp3,woff2}'],
        globIgnores: ['images/personality/*.png']
      }
    })
    ]
  }
})
