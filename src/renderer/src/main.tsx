import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GlobalWorkerOptions } from 'pdfjs-dist'
import './pdf-upsert-polyfill'
import App from './App'
import './styles.css'

// Use a custom worker entry that polyfills the TC39 Map upsert helpers inside
// the Worker realm before loading pdf.js. The stock worker would otherwise throw
// "getOrInsertComputed is not a function" while rendering form-field pages, since
// the main-thread polyfill above does not reach the separate Worker global scope.
const pdfWorker = new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' })
GlobalWorkerOptions.workerPort = pdfWorker

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
