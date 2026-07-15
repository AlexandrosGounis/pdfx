export async function readClipboardImage(): Promise<Uint8Array | null> {
  try {
    const items = await navigator.clipboard.read()
    for (const item of items) {
      const type =
        item.types.find((t) => t === 'image/png') ?? item.types.find((t) => t.startsWith('image/'))
      if (!type) continue
      const blob = await item.getType(type)
      return new Uint8Array(await blob.arrayBuffer())
    }
  } catch {
    return null
  }
  return null
}

export async function clearClipboard(): Promise<void> {
  try {
    await navigator.clipboard.writeText('')
  } catch {
    return
  }
}
