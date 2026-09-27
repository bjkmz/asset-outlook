import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy: any) => {
          proxy.on('error', (err: Error, _req: any, res: any) => {
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
              try {
                res.writeHead(503, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'API not ready - run: bun run server' }))
              } catch {
                // socket already gone
              }
            }
            console.log(`[proxy] backend down (${err.message}). Run: bun run server`)
          })
        },
      },
    },
  },
})
