import { copyFileSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const FILES = [
  'jbig2.wasm',
  'jbig2_nowasm_fallback.js',
  'openjpeg.wasm',
  'openjpeg_nowasm_fallback.js',
  'qcms_bg.wasm'
]

const root = fileURLToPath(new URL('../', import.meta.url))
const src = join(root, 'node_modules', 'pdfjs-dist', 'wasm')
const dest = join(root, 'resources', 'pdf')

if (!existsSync(src)) {
  console.warn('[copy-pdf-assets] pdfjs-dist not installed yet; skipping.')
  process.exit(0)
}

rmSync(dest, { recursive: true, force: true })
mkdirSync(dest, { recursive: true })

let bytes = 0
for (const f of FILES) {
  copyFileSync(join(src, f), join(dest, f))
  bytes += statSync(join(dest, f)).size
}

const mb = (bytes / 1024 / 1024).toFixed(1)
console.log(
  `[copy-pdf-assets] Staged ${FILES.length} pdf.js decoder files → resources/pdf (${mb} MB).`
)
