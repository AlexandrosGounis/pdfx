import type { SaveFilter } from '../../../../preload'

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  pdfx: 'application/octet-stream',
  zip: 'application/zip'
}

interface SaveFilePickerOptions {
  suggestedName?: string
  types?: { description?: string; accept: Record<string, string[]> }[]
}

type ShowSaveFilePicker = (options: SaveFilePickerOptions) => Promise<FileSystemFileHandle>

const savePicker = (): ShowSaveFilePicker | null => {
  const picker = (window as { showSaveFilePicker?: ShowSaveFilePicker }).showSaveFilePicker
  return typeof picker === 'function' ? picker.bind(window) : null
}

const pendingHandles = new Map<string, FileSystemFileHandle>()

export async function chooseSavePath(
  defaultName: string,
  filter?: SaveFilter
): Promise<string | null> {
  const show = savePicker()
  if (!show) return defaultName
  const ext = filter?.extensions[0] ?? 'pdfx'
  try {
    const handle = await show({
      suggestedName: defaultName,
      types: [
        {
          description: filter?.name,
          accept: { [MIME_BY_EXT[ext] ?? 'application/octet-stream']: [`.${ext}`] }
        }
      ]
    })
    pendingHandles.set(handle.name, handle)
    return handle.name
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null
    return defaultName
  }
}

export async function writeFile(path: string, data: Uint8Array): Promise<string> {
  const bytes = data as Uint8Array<ArrayBuffer>
  const handle = pendingHandles.get(path)
  if (handle) {
    pendingHandles.delete(path)
    const writable = await handle.createWritable()
    await writable.write(bytes)
    await writable.close()
    return handle.name
  }
  const name = path.split(/[\\/]/).pop() || path
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const blob = new Blob([bytes], { type: MIME_BY_EXT[ext] ?? 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return name
}
