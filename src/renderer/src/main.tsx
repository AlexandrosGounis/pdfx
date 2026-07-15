import './platform/web/install'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GlobalWorkerOptions } from 'pdfjs-dist'
import './pdf-upsert-polyfill'
import App from './App'
import './styles.css'

const pdfWorker = new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' })
GlobalWorkerOptions.workerPort = pdfWorker

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
