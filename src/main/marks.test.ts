// SPDX-License-Identifier: MIT
import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtemp, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { createMarkStore } from './marks'

// A byte array that begins with the PNG magic signature (so the store's PNG check passes).
const png = (n: number): Uint8Array => {
  const b = new Uint8Array(Math.max(n, 8))
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return b
}
let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'marks-'))
})

describe('createMarkStore', () => {
  it('save then list round-trips the mark (meta + png)', async () => {
    const store = createMarkStore(dir)
    const saved = await store.save({ role: 'signature', kind: 'draw', width: 300, height: 100, png: png(10) })
    expect(saved.id).toMatch(/^[0-9a-fA-F-]{36}$/)
    expect(saved.role).toBe('signature')
    expect(saved.kind).toBe('draw')
    const list = await store.list()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(saved.id)
    expect(list[0].kind).toBe('draw')
    expect(Array.from(list[0].png)).toEqual(Array.from(png(10)))
  })

  it('remove archives the mark (gone from list, PNG moved to .trash — not hard-deleted)', async () => {
    const store = createMarkStore(dir)
    const saved = await store.save({ role: 'initials', kind: 'type', width: 50, height: 50, png: png(5) })
    await store.remove(saved.id)
    expect(await store.list()).toHaveLength(0)
    expect(existsSync(join(dir, `${saved.id}.png`))).toBe(false)
    expect(existsSync(join(dir, '.trash', `${saved.id}.png`))).toBe(true)
  })

  it('rejects a non-UUID id on remove (path-traversal guard) without touching the store', async () => {
    const store = createMarkStore(dir)
    await store.save({ role: 'signature', kind: 'image', width: 1, height: 1, png: png(3) })
    await expect(store.remove('../../evil')).rejects.toThrow()
    await expect(store.remove('a/b')).rejects.toThrow()
    expect(await store.list()).toHaveLength(1) // unchanged
  })

  it('rejects invalid role, invalid kind, non-PNG bytes, and oversized png', async () => {
    const store = createMarkStore(dir)
    // @ts-expect-error invalid role
    await expect(store.save({ role: 'x', kind: 'draw', width: 1, height: 1, png: png(1) })).rejects.toThrow()
    // @ts-expect-error invalid kind
    await expect(store.save({ role: 'signature', kind: 'z', width: 1, height: 1, png: png(1) })).rejects.toThrow()
    await expect(
      store.save({ role: 'signature', kind: 'draw', width: 1, height: 1, png: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]) })
    ).rejects.toThrow()
    await expect(
      store.save({ role: 'signature', kind: 'draw', width: 1, height: 1, png: png(5 * 1024 * 1024 + 1) })
    ).rejects.toThrow()
  })

  it('returns [] for a missing or corrupt index rather than throwing', async () => {
    const store = createMarkStore(dir)
    expect(await store.list()).toEqual([]) // no index yet
    await writeFile(join(dir, 'marks.json'), 'not json{')
    expect(await store.list()).toEqual([]) // corrupt -> empty
  })

  it('skips an index entry whose id would escape the store dir (confined guard)', async () => {
    const store = createMarkStore(dir)
    // Plant a file in the PARENT of the store dir, then poison the index to point outside.
    await writeFile(join(dir, '..', 'escape.png'), png(4))
    await writeFile(
      join(dir, 'marks.json'),
      JSON.stringify([
        { id: '../escape', role: 'signature', kind: 'image', width: 1, height: 1, createdAt: '2026-07-02' }
      ])
    )
    expect(await store.list()).toEqual([]) // entry skipped; the outside file is never surfaced
  })
})
