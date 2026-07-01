import { copyFileSync, mkdirSync, readdirSync, rmSync, existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const OCR_LANGS = ['eng', 'deu', 'fra', 'spa']

const root = fileURLToPath(new URL('../', import.meta.url))
const nm = join(root, 'node_modules')
const dest = join(root, 'resources', 'ocr')

const coreDir = join(nm, 'tesseract.js-core')
const workerJs = join(nm, 'tesseract.js', 'dist', 'worker.min.js')

if (!existsSync(coreDir) || !existsSync(workerJs)) {
  console.warn('[copy-ocr-assets] tesseract.js not installed yet; skipping.')
  process.exit(0)
}

rmSync(dest, { recursive: true, force: true })
mkdirSync(join(dest, 'core'), { recursive: true })
mkdirSync(join(dest, 'lang'), { recursive: true })

let bytes = 0
const copy = (from, to) => {
  copyFileSync(from, to)
  bytes += statSync(to).size
}

copy(workerJs, join(dest, 'worker.min.js'))

const coreFiles = readdirSync(coreDir).filter((f) => /-lstm\.wasm(\.js)?$/.test(f))
for (const f of coreFiles) copy(join(coreDir, f), join(dest, 'core', f))

for (const lang of OCR_LANGS) {
  const from = join(nm, '@tesseract.js-data', lang, '4.0.0_best_int', `${lang}.traineddata.gz`)
  if (!existsSync(from)) {
    console.warn(`[copy-ocr-assets] missing language data for "${lang}"; skipping.`)
    continue
  }
  copy(from, join(dest, 'lang', `${lang}.traineddata.gz`))
}

const mb = (bytes / 1024 / 1024).toFixed(1)
console.log(
  `[copy-ocr-assets] Staged ${coreFiles.length} core files + ${OCR_LANGS.length} languages → resources/ocr (${mb} MB).`
)
