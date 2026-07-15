import type { OpenedFile } from '../../../../preload'

const ACCEPT = '.pdf,.pdfx,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif,.txt,.rtf,.svg,.html,.htm'

export async function toOpenedFiles(files: File[]): Promise<OpenedFile[]> {
  return Promise.all(
    files.map(async (file) => ({ name: file.name, data: new Uint8Array(await file.arrayBuffer()) }))
  )
}

export function openFiles(): Promise<OpenedFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = ACCEPT
    input.style.display = 'none'
    input.addEventListener(
      'change',
      () => {
        const files = Array.from(input.files ?? [])
        input.remove()
        resolve(toOpenedFiles(files))
      },
      { once: true }
    )
    input.addEventListener(
      'cancel',
      () => {
        input.remove()
        resolve([])
      },
      { once: true }
    )
    document.body.append(input)
    input.click()
  })
}
