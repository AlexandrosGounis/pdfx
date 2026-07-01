import { app, nativeTheme, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { FALLBACK_BG } from './native/glass'
import { collectFileArgs } from './file-intake'
import { createWindow, getMainWindow, getRendererReady, sendOpenPaths } from './window'
import { buildMenu } from './menu'
import { registerIpc } from './register-ipc'
import { registerOcrProtocol, registerOcrSchemePrivileged } from './ocr-assets'

app.setName('PDFx')

registerOcrSchemePrivileged()

if (process.env.PDFX_USER_DATA) {
  app.setPath('userData', process.env.PDFX_USER_DATA)
}

let pendingOpenPaths: string[] = []

app.on('open-file', (event, path) => {
  event.preventDefault()
  if (getRendererReady()) {
    void sendOpenPaths([path])
  } else {
    pendingOpenPaths.push(path)
  }
})

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const mainWindow = getMainWindow()
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
    void sendOpenPaths(collectFileArgs(argv.slice(1)))
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.pdfx.app')

    registerOcrProtocol()

    nativeTheme.themeSource = 'dark'

    if (process.platform === 'darwin' && is.dev) {
      const devIcon = join(app.getAppPath(), 'build', 'icon.png')
      if (existsSync(devIcon)) app.dock?.setIcon(devIcon)
    }

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window, { zoom: true })
    })

    pendingOpenPaths.push(...collectFileArgs(process.argv.slice(1)))

    registerIpc(
      () => pendingOpenPaths,
      () => {
        pendingOpenPaths = []
      }
    )

    buildMenu()
    createWindow()

    if (process.platform !== 'darwin') {
      nativeTheme.on('updated', () => {
        getMainWindow()?.setBackgroundColor(
          nativeTheme.shouldUseDarkColors ? FALLBACK_BG.dark : FALLBACK_BG.light
        )
      })
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
