// Custom pdf.js worker entry: apply the upsert polyfill in the Worker realm
// FIRST, then load the stock pdf.js worker. Static imports execute in source
// order, and the polyfill is a synchronous side effect, so it is in place
// before pdf.js attaches its message handlers — no init race.
import './pdf-upsert-polyfill'
import 'pdfjs-dist/build/pdf.worker.min.mjs'
