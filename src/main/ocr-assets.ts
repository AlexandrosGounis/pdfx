import { app, protocol } from 'electron'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const SCHEME = 'pdfx-ocr'

export function registerOcrSchemePrivileged(): void {
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

function ocrRoot(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'ocr')
    : join(app.getAppPath(), 'resources', 'ocr')
}

function contentType(path: string): string {
  if (path.endsWith('.wasm.js') || path.endsWith('.js')) return 'text/javascript'
  if (path.endsWith('.wasm')) return 'application/wasm'
  return 'application/octet-stream'
}

export function registerOcrProtocol(): void {
  const root = ocrRoot()
  protocol.handle(SCHEME, async (request) => {
    const rel = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, '')
    if (rel.length === 0 || rel.includes('..')) {
      return new Response('Forbidden', { status: 403 })
    }
    try {
      const data = await readFile(join(root, rel))
      return new Response(new Uint8Array(data), {
        headers: { 'content-type': contentType(rel) }
      })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}
