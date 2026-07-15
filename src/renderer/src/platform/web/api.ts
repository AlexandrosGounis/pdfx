import { markupToPdf } from './markup-to-pdf'
import { chooseSavePath, writeFile } from './save'
import { openFiles } from './open-files'
import { readClipboardImage, clearClipboard } from './clipboard'
import { onZoom, onMenu } from './menu-keys'
import { initLaunchQueue, onFilesOpened, rendererReady } from './launch-queue'
import type { PdfxApi } from '../../../../preload'

export function createWebApi(): PdfxApi {
  initLaunchQueue()
  return {
    platform: 'linux',
    rendererReady,
    chooseSavePath,
    readClipboardImage,
    readClipboardFiles: async () => [],
    clearClipboard,
    getPathForFile: () => '',
    expandDropPaths: async () => [],
    readResource: async () => null,
    markupToPdf,
    writeFile,
    openFiles,
    onFilesOpened,
    onZoom,
    onMenu
  }
}
