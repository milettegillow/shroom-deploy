import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const GH_RELEASE_BASE = 'https://github.com/milettegillow/shroom-deploy/releases/download/v1.0'

/** Dev-only plugin: proxies /gh-assets/* to GitHub Releases, following redirects server-side to avoid CORS. */
function ghAssetsProxy(): Plugin {
  return {
    name: 'gh-assets-proxy',
    configureServer(server) {
      server.middlewares.use('/gh-assets', async (req, res) => {
        try {
          const upstream = await fetch(`${GH_RELEASE_BASE}${req.url}`, { redirect: 'follow' })
          if (!upstream.ok || !upstream.body) {
            res.writeHead(upstream.status)
            res.end()
            return
          }
          res.writeHead(200, { 'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream' })
          // Pipe the ReadableStream to the Node response
          const reader = (upstream.body as ReadableStream<Uint8Array>).getReader()
          const pump = async () => {
            while (true) {
              const { done, value } = await reader.read()
              if (done) { res.end(); return }
              res.write(value)
            }
          }
          await pump()
        } catch {
          res.writeHead(502)
          res.end('Upstream fetch failed')
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ghAssetsProxy()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    allowedHosts: ['.trycloudflare.com'],
  },
})
