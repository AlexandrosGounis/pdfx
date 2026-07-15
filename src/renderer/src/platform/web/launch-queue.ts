import { toOpenedFiles } from './open-files'
import type { OpenedFile } from '../../../../preload'

interface LaunchParams {
  files?: FileSystemHandle[]
}

interface LaunchQueue {
  setConsumer(consumer: (params: LaunchParams) => void): void
}

type Listener = (files: OpenedFile[]) => void

const listeners = new Set<Listener>()
let queued: OpenedFile[][] = []

function dispatch(files: OpenedFile[]): void {
  if (files.length === 0) return
  if (listeners.size === 0) {
    queued.push(files)
    return
  }
  for (const listener of listeners) listener(files)
}

export function initLaunchQueue(): void {
  const queue = (window as { launchQueue?: LaunchQueue }).launchQueue
  queue?.setConsumer((params) => {
    const handles = (params.files ?? []).filter((h): h is FileSystemFileHandle => h.kind === 'file')
    if (handles.length === 0) return
    void Promise.all(handles.map((h) => h.getFile()))
      .then(toOpenedFiles)
      .then(dispatch)
      .catch(() => {})
  })
}

export function onFilesOpened(callback: Listener): () => void {
  listeners.add(callback)
  const pending = queued
  queued = []
  for (const files of pending) callback(files)
  return () => {
    listeners.delete(callback)
  }
}

export function rendererReady(): Promise<void> {
  return Promise.resolve()
}
