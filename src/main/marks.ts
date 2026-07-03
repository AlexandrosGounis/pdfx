// SPDX-License-Identifier: MIT
import { mkdir, readFile, writeFile, rename, unlink } from 'fs/promises'
import { join, resolve, relative, isAbsolute } from 'path'
import { randomUUID } from 'crypto'

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
export interface MarkMeta {
  id: string
  role: MarkRole
  kind: MarkKind
  width: number
  height: number
  label?: string
  createdAt: string
}
export interface StoredMark extends MarkMeta {
  png: Uint8Array
}

const INDEX = 'marks.json'
const MAX_PNG_BYTES = 5 * 1024 * 1024 // 5 MiB per saved mark
const MAX_MARKS = 100 // anti-spam cap on stored marks
const ID_RE = /^[0-9a-fA-F-]{36}$/ // UUID shape
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47] // "\x89PNG"
const ROLES: readonly MarkRole[] = ['signature', 'initials']
const KINDS: readonly MarkKind[] = ['draw', 'type', 'image']

// Resolve <dir>/<name> and confirm it stays inside dir. Throws on any escape.
// Lexical (resolve/relative), not realpath as in resource.ts — sufficient here because the
// directory is app-managed and the renderer cannot plant symlinks through this API.
function confined(dir: string, name: string): string {
  const target = resolve(dir, name)
  const rel = relative(dir, target)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error('marks: refusing path outside store')
  }
  return target
}

function finiteNonNeg(n: unknown): number {
  const v = Number(n)
  return Number.isFinite(v) && v > 0 ? v : 0
}

function isMeta(x: unknown): x is MarkMeta {
  const m = x as MarkMeta
  return (
    !!m &&
    typeof m.id === 'string' &&
    ROLES.includes(m.role) &&
    KINDS.includes(m.kind) &&
    typeof m.width === 'number' &&
    typeof m.height === 'number' &&
    typeof m.createdAt === 'string'
  )
}

export function createMarkStore(dir: string): {
  list(): Promise<StoredMark[]>
  save(input: MarkInput): Promise<StoredMark>
  remove(id: string): Promise<void>
} {
  const indexPath = join(dir, INDEX)

  async function readIndex(): Promise<MarkMeta[]> {
    try {
      const parsed = JSON.parse(await readFile(indexPath, 'utf8'))
      return Array.isArray(parsed) ? parsed.filter(isMeta) : []
    } catch {
      return [] // missing or corrupt -> start empty
    }
  }

  async function writeIndex(metas: MarkMeta[]): Promise<void> {
    await mkdir(dir, { recursive: true })
    // Atomic write: a crash mid-write must not corrupt the live index.
    const tmp = `${indexPath}.tmp`
    await writeFile(tmp, JSON.stringify(metas, null, 2))
    await rename(tmp, indexPath)
  }

  return {
    async list(): Promise<StoredMark[]> {
      const out: StoredMark[] = []
      for (const m of await readIndex()) {
        try {
          const png = new Uint8Array(await readFile(confined(dir, `${m.id}.png`)))
          out.push({ ...m, png })
        } catch {
          // PNG missing/unreadable, or id would escape the store -> skip this entry
        }
      }
      return out
    },

    async save(input: MarkInput): Promise<StoredMark> {
      if (!ROLES.includes(input.role)) throw new Error('marks: invalid role')
      if (!KINDS.includes(input.kind)) throw new Error('marks: invalid kind')
      if (
        !ArrayBuffer.isView(input.png) ||
        input.png.byteLength < 8 ||
        input.png.byteLength > MAX_PNG_BYTES
      ) {
        throw new Error('marks: invalid png payload')
      }
      if (!PNG_MAGIC.every((b, i) => input.png[i] === b)) throw new Error('marks: not a PNG')
      const metas = await readIndex()
      if (metas.length >= MAX_MARKS) throw new Error('marks: store is full')
      const id = randomUUID() // server-side id — renderer never supplies a path
      const meta: MarkMeta = {
        id,
        role: input.role,
        kind: input.kind,
        width: finiteNonNeg(input.width),
        height: finiteNonNeg(input.height),
        label: typeof input.label === 'string' ? input.label.slice(0, 200) : undefined,
        createdAt: new Date().toISOString()
      }
      await mkdir(dir, { recursive: true })
      await writeFile(confined(dir, `${id}.png`), input.png)
      metas.push(meta)
      await writeIndex(metas)
      return { ...meta, png: input.png }
    },

    async remove(id: string): Promise<void> {
      if (typeof id !== 'string' || !ID_RE.test(id)) throw new Error('marks: invalid id')
      const next = (await readIndex()).filter((m) => m.id !== id)
      try {
        await unlink(confined(dir, `${id}.png`))
      } catch {
        // already gone -> nothing to remove
      }
      await writeIndex(next)
    }
  }
}
