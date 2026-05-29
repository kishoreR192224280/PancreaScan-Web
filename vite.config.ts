import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const mimeFixPlugin = {
  name: 'mime-fix-plugin',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      const url = req.url || '';
      const pathname = url.split('?')[0];
      if (pathname.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm');
      } else if (pathname.endsWith('.js') || pathname.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (pathname.endsWith('.ts') || pathname.endsWith('.tsx')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
      next();
    });
  }
};

export default defineConfig({
  plugins: [
    react(),
    mimeFixPlugin,
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,ico}'],
        maximumFileSizeToCacheInBytes: 150000000,
        runtimeCaching: [
          {
            urlPattern: /\/models\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'onnx-models-cache',
              expiration: { maxEntries: 5 },
            },
          },
        ],
      },
      manifest: {
        name: 'PancreaScan',
        short_name: 'PancreaScan',
        description: 'AI-Powered Early Detection of Pancreatic Anomalies',
        theme_color: '#080C1A',
        background_color: '#080C1A',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/logo.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://14.139.187.229:8081/oct/pancreas',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
