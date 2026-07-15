import { PDFDocument } from 'pdf-lib'

const PT_TO_PX = 96 / 72
const MM_TO_PT = 72 / 25.4
const LETTER = { width: 612, height: 792 }
const RASTER_SCALE = 2
const MAX_PAGES = 500

interface PageSize {
  width: number
  height: number
}

function pageSizeFromCss(html: string): PageSize {
  const matches = [...html.matchAll(/@page\{size:([\d.]+)mm ([\d.]+)mm/g)]
  const last = matches[matches.length - 1]
  if (!last) return LETTER
  return { width: parseFloat(last[1]) * MM_TO_PT, height: parseFloat(last[2]) * MM_TO_PT }
}

function loadFrame(html: string, widthPx: number, heightPx: number): Promise<HTMLIFrameElement> {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe')
    frame.setAttribute('sandbox', 'allow-same-origin')
    frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${widthPx}px;height:${heightPx}px;border:0;visibility:hidden`
    frame.addEventListener('load', () => resolve(frame), { once: true })
    frame.srcdoc = html
    document.body.append(frame)
  })
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('markup raster failed'))
    image.src = url
  })
}

const pageSvg = (
  xhtml: string,
  widthPx: number,
  pageHeightPx: number,
  totalHeightPx: number,
  index: number
): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${pageHeightPx}" viewBox="0 ${index * pageHeightPx} ${widthPx} ${pageHeightPx}"><foreignObject width="${widthPx}" height="${totalHeightPx}">${xhtml}</foreignObject></svg>`

async function rasterPage(svg: string, widthPx: number, heightPx: number): Promise<Uint8Array> {
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  const image = await loadImage(url)
  await image.decode().catch(() => {})
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(widthPx * RASTER_SCALE)
  canvas.height = Math.ceil(heightPx * RASTER_SCALE)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('markup raster: no 2d context')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('markup raster: encode failed')
  return new Uint8Array(await blob.arrayBuffer())
}

export async function markupToPdf(html: string, fitPageHeightPx?: number): Promise<Uint8Array> {
  const page = pageSizeFromCss(html)
  const pageWidthPx = Math.round(page.width * PT_TO_PX)
  const pageHeightPx = Math.round(page.height * PT_TO_PX)
  const frame = await loadFrame(html, pageWidthPx, pageHeightPx)
  try {
    const doc = frame.contentDocument
    if (!doc?.body) throw new Error('markup frame unavailable')
    await doc.fonts.ready.catch(() => {})
    const body = doc.body
    if (fitPageHeightPx != null) {
      body.style.transformOrigin = 'top left'
      const height = body.scrollHeight
      if (height > fitPageHeightPx + 1) body.style.transform = `scale(${fitPageHeightPx / height})`
    }
    const contentHeightPx =
      fitPageHeightPx != null
        ? pageHeightPx
        : Math.max(doc.documentElement.scrollHeight, body.scrollHeight, 1)
    const pageCount = Math.min(MAX_PAGES, Math.max(1, Math.ceil(contentHeightPx / pageHeightPx)))
    const totalHeightPx = pageCount * pageHeightPx
    const xmlName = /^[A-Za-z_][\w.-]*(?::[\w.-]+)?$/
    for (const el of Array.from(doc.querySelectorAll('*'))) {
      for (const attr of Array.from(el.attributes)) {
        if (!xmlName.test(attr.name)) el.removeAttribute(attr.name)
      }
    }
    const xhtml = new XMLSerializer()
      .serializeToString(doc.documentElement)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    const pdf = await PDFDocument.create()
    for (let i = 0; i < pageCount; i++) {
      const png = await rasterPage(
        pageSvg(xhtml, pageWidthPx, pageHeightPx, totalHeightPx, i),
        pageWidthPx,
        pageHeightPx
      )
      const embedded = await pdf.embedPng(png)
      pdf
        .addPage([page.width, page.height])
        .drawImage(embedded, { x: 0, y: 0, width: page.width, height: page.height })
    }
    return await pdf.save()
  } finally {
    frame.remove()
  }
}
