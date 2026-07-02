import { contextBridge, ipcRenderer, webUtils } from 'electron'

export interface OpenedFile {
  name: string
  data: Uint8Array
  path?: string
}

export type ZoomAction = 'in' | 'out' | 'reset'

export type MenuAction = 'open' | 'export-pdfx' | 'export-pdf' | 'export-zip'

export interface SaveFilter {
  name: string
  extensions: string[]
}

export type MarkRole = 'signature' | 'initials'
export type MarkKind = 'draw' | 'type' | 'image'
export interface MarkInput {
  role: MarkRole
  kind: MarkKind
  width: number
  height: number
  label?: string
  png: Uint8Array
}
export interface StoredMark {
  id: string
  role: MarkRole
  kind: MarkKind
  width: number
  height: number
  label?: string
  createdAt: string
  png: Uint8Array
}

const api = {
  platform: process.platform,
  rendererReady: (): Promise<void> => ipcRenderer.invoke('pdfx:renderer-ready'),
  chooseSavePath: (defaultName: string, filter?: SaveFilter): Promise<string | null> =>
    ipcRenderer.invoke('pdfx:choose-save-path', defaultName, filter),
  readClipboardImage: (): Promise<Uint8Array | null> =>
    ipcRenderer.invoke('pdfx:read-clipboard-image'),
  readClipboardFiles: (): Promise<OpenedFile[]> => ipcRenderer.invoke('pdfx:read-clipboard-files'),
  clearClipboard: (): Promise<void> => ipcRenderer.invoke('pdfx:clipboard-clear'),
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),
  expandDropPaths: (paths: string[]): Promise<OpenedFile[]> =>
    ipcRenderer.invoke('pdfx:expand-drop-paths', paths),
  readResource: (
    htmlPath: string,
    ref: string
  ): Promise<{ data: Uint8Array; mime: string } | null> =>
    ipcRenderer.invoke('pdfx:read-resource', htmlPath, ref),
  markupToPdf: (html: string, fitPageHeightPx?: number): Promise<Uint8Array> =>
    ipcRenderer.invoke('pdfx:markup-to-pdf', html, fitPageHeightPx),
  writeFile: (path: string, data: Uint8Array): Promise<string> =>
    ipcRenderer.invoke('pdfx:write-file', path, data),
  openFiles: (): Promise<OpenedFile[]> => ipcRenderer.invoke('pdfx:open-files'),
  marks: {
    list: (): Promise<StoredMark[]> => ipcRenderer.invoke('pdfx:marks-list'),
    save: (input: MarkInput): Promise<StoredMark> => ipcRenderer.invoke('pdfx:marks-save', input),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('pdfx:marks-remove', id)
  },
  onFilesOpened: (callback: (files: OpenedFile[]) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, files: OpenedFile[]): void =>
      callback(files)
    ipcRenderer.on('pdfx:files-opened', listener)
    return () => ipcRenderer.removeListener('pdfx:files-opened', listener)
  },
  onZoom: (callback: (action: ZoomAction) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, action: ZoomAction): void =>
      callback(action)
    ipcRenderer.on('pdfx:zoom', listener)
    return () => ipcRenderer.removeListener('pdfx:zoom', listener)
  },
  onMenu: (callback: (action: MenuAction) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, action: MenuAction): void =>
      callback(action)
    ipcRenderer.on('pdfx:menu', listener)
    return () => ipcRenderer.removeListener('pdfx:menu', listener)
  }
}

export type PdfxApi = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.api = api
}
