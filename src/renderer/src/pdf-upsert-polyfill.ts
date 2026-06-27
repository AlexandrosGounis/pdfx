// pdf.js 5.x calls the TC39 "upsert" helpers Map.prototype.getOrInsert /
// getOrInsertComputed, which some Electron/V8 builds do not yet ship natively.
// This must run in EVERY realm that executes pdf.js code — the renderer main
// thread AND the pdf.js Worker thread (separate global scope). Importing this as
// a side-effect module guarantees the patch is applied before pdf.js runs.
const mapProto = Map.prototype as unknown as Record<string, unknown>

if (typeof mapProto.getOrInsertComputed !== 'function') {
  mapProto.getOrInsertComputed = function (
    this: Map<unknown, unknown>,
    key: unknown,
    compute: (key: unknown) => unknown
  ) {
    if (!this.has(key)) this.set(key, compute(key))
    return this.get(key)
  }
}

if (typeof mapProto.getOrInsert !== 'function') {
  mapProto.getOrInsert = function (this: Map<unknown, unknown>, key: unknown, value: unknown) {
    if (!this.has(key)) this.set(key, value)
    return this.get(key)
  }
}
