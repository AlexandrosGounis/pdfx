import { app, protocol } from 'electron'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const SCHEME = 'pdfx-assets'
const DIRS = new Set(['ocr', 'pdf'])

export function registerAssetSchemePrivileged(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true
      }
    }
  ])
}

function assetsRoot(): string {
  return app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')
}

function contentType(path: string): string {
  if (path.endsWith('.wasm.js') || path.endsWith('.js')) return 'text/javascript'
  if (path.endsWith('.wasm')) return 'application/wasm'
  return 'application/octet-stream'
}

export function registerAssetProtocol(): void {
  const root = assetsRoot()
  protocol.handle(SCHEME, async (request) => {
    const url = new URL(request.url)
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '')
    if (!DIRS.has(url.hostname) || rel.length === 0 || rel.includes('..')) {
      return new Response('Forbidden', { status: 403 })
    }
    try {
      const data = await readFile(join(root, url.hostname, rel))
      return new Response(new Uint8Array(data), {
        headers: { 'content-type': contentType(rel) }
      })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}
