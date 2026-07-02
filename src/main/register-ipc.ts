import { ipcMain, dialog, clipboard, app } from 'electron'
import { basename, isAbsolute, join } from 'path'
import { existsSync } from 'fs'
import { writeFile } from 'fs/promises'
import { markupToPdf } from './markup'
import { OpenedFile, IMPORTABLE, readFiles, expandDropPaths } from './file-intake'
import { clipboardFilePaths } from './clipboard'
import { readResource } from './resource'
import { getMainWindow, setRendererReady, sendOpenPaths } from './window'
import { createMarkStore } from './marks'

const MAX_WRITE_BYTES = 1024 * 1024 * 1024 // 1 GiB cap on a single IPC write

export function registerIpc(getPending: () => string[], clearPending: () => void): void {
  ipcMain.handle('pdfx:renderer-ready', async () => {
    setRendererReady(true)
    const paths = getPending()
    clearPending()
    await sendOpenPaths(paths)
  })

  ipcMain.handle(
    'pdfx:choose-save-path',
    async (_event, defaultName: string, filter?: { name: string; extensions: string[] }) => {
      const mainWindow = getMainWindow()
      if (!mainWindow) return null
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export',
        defaultPath: defaultName,
        filters: [filter ?? { name: 'PDFX', extensions: ['pdfx'] }]
      })
      return result.canceled || !result.filePath ? null : result.filePath
    }
  )

  ipcMain.handle('pdfx:read-clipboard-image', () => {
    const image = clipboard.readImage()
    return image.isEmpty() ? null : new Uint8Array(image.toPNG())
  })

  ipcMain.handle('pdfx:read-clipboard-files', async (): Promise<OpenedFile[]> => {
    const paths = clipboardFilePaths().filter((p) => IMPORTABLE.test(p) && existsSync(p))
    return readFiles(paths)
  })

  ipcMain.handle('pdfx:clipboard-clear', () => clipboard.clear())

  ipcMain.handle(
    'pdfx:expand-drop-paths',
    async (_event, paths: string[]): Promise<OpenedFile[]> =>
      readFiles(await expandDropPaths(paths))
  )

  ipcMain.handle('pdfx:read-resource', (_event, htmlPath: string, ref: string) =>
    readResource(htmlPath, ref)
  )

  ipcMain.handle(
    'pdfx:markup-to-pdf',
    (_event, html: string, fitPageHeightPx?: number): Promise<Uint8Array> => {
      // Coerce to a finite positive number so the value can never be a string that
      // breaks out of the numeric context where markup.ts interpolates it into
      // executeJavaScript.
      const ph = Number(fitPageHeightPx)
      return markupToPdf(html, Number.isFinite(ph) && ph > 0 ? ph : undefined)
    }
  )

  ipcMain.handle('pdfx:write-file', async (_event, path: string, data: Uint8Array) => {
    // The renderer must hand us a concrete absolute path (these come from the native
    // save dialog). Reject relative paths, null-byte truncation tricks, and absurd
    // payload sizes so a compromised renderer can't turn this into a write primitive.
    if (typeof path !== 'string' || !path || path.includes('\0') || !isAbsolute(path)) {
      throw new Error('write-file: refusing invalid path')
    }
    if (!ArrayBuffer.isView(data) || data.byteLength > MAX_WRITE_BYTES) {
      throw new Error('write-file: refusing invalid payload')
    }
    await writeFile(path, data)
    return basename(path)
  })

  ipcMain.handle('pdfx:open-files', async (): Promise<OpenedFile[]> => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return []
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open documents',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Documents',
          extensions: [
            'pdf',
            'pdfx',
            'png',
            'jpg',
            'jpeg',
            'webp',
            'gif',
            'bmp',
            'avif',
            'txt',
            'rtf',
            'svg',
            'html',
            'htm'
          ]
        },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (result.canceled) return []
    return readFiles(result.filePaths)
  })

  const marks = createMarkStore(join(app.getPath('userData'), 'signatures'))
  ipcMain.handle('pdfx:marks-list', () => marks.list())
  ipcMain.handle('pdfx:marks-save', (_event, input) => marks.save(input))
  ipcMain.handle('pdfx:marks-remove', (_event, id: string) => marks.remove(id))
}
