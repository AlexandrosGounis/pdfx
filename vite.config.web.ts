import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  publicDir: resolve(__dirname, 'resources'),
  define: {
    'import.meta.env.VITE_PDFX_WEB': 'true'
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src'),
      'tesseract.js': 'tesseract.js/dist/tesseract.esm.min.js'
    }
  },
  worker: {
    format: 'es'
  },
  plugins: [
    react(),
    {
      name: 'web-csp',
      transformIndexHtml: (html) =>
        html.replace("connect-src 'self'", "connect-src 'self' https://api.github.com")
    }
  ],
  build: {
    outDir: resolve(__dirname, 'out/web'),
    emptyOutDir: true
  }
})
