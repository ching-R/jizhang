import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base so the built site works at a domain root or a subpath (GitHub Pages project sites).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: '记账',
        short_name: '记账',
        description: '每天几秒，记下开销，慢慢攒钱',
        lang: 'zh-CN',
        dir: 'ltr',
        id: './',
        start_url: './?add=1',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f3f0ea',
        theme_color: '#1b6b56',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: '记一笔',
            short_name: '记一笔',
            description: '打开就记一笔',
            url: './?add=1',
            icons: [{ src: 'icons/shortcut-add.png', sizes: '192x192', type: 'image/png', purpose: 'any' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: './index.html',
        navigateFallbackAllowlist: [/^\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { host: '0.0.0.0', port: 47321, strictPort: true },
  preview: { host: '0.0.0.0', port: 47322, strictPort: true },
})
