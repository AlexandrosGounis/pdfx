// SPDX-License-Identifier: MIT
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { SignatureCapture } from './SignatureCapture'
import type { MarkAsset } from '../../pdfx/sign/types'

// jsdom has no real <canvas> 2d context, so the actual canvas-based render helpers
// (which need a working context) cannot run here — they're verified manually in the
// running app (see the task report). Mock them so the Save wiring itself (blank
// guard -> save() -> Saved tab) is still exercised without touching real canvas.
vi.mock('./signature-render', () => ({
  trimToPng: vi.fn(async () => ({ png: new Uint8Array([1, 2, 3]), width: 10, height: 10 })),
  typedSignatureToPng: vi.fn(async () => ({ png: new Uint8Array([1, 2, 3]), width: 10, height: 10 })),
  fileToTrimmedPng: vi.fn(async () => ({ png: new Uint8Array([1, 2, 3]), width: 10, height: 10 })),
  canvasToPngBytes: vi.fn(async () => new Uint8Array([1, 2, 3]))
}))

const asset = (id: string): MarkAsset => ({
  id,
  role: 'signature',
  kind: 'draw',
  png: new Uint8Array([137, 80, 78, 71]),
  width: 10,
  height: 10,
  createdAt: '2026-07-03'
})

beforeEach(() => {
  let store: MarkAsset[] = [asset('a')]
  // Minimal window.api.marks mock, mirroring useMarkLibrary.test.ts.
  ;(window as unknown as { api: unknown }).api = {
    marks: {
      list: vi.fn(async () => store),
      save: vi.fn(async (input: Omit<MarkAsset, 'id' | 'createdAt'>) => {
        const created = { ...input, id: 'new', createdAt: '2026-07-03' } as MarkAsset
        store = [...store, created]
        return created
      }),
      remove: vi.fn(async (id: string) => {
        store = store.filter((m) => m.id !== id)
      })
    }
  }
})

// @testing-library/react does not auto-register cleanup unless vitest's `globals`
// option is on (it isn't here, matching this repo's explicit-import test style).
afterEach(() => cleanup())

describe('SignatureCapture', () => {
  it('renders the Draw/Type/Upload/Saved tabs', () => {
    render(<SignatureCapture onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Draw' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Type' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Upload' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Saved/ })).toBeTruthy()
  })

  it('calls onClose when the close (X) button is clicked', () => {
    const onClose = vi.fn()
    render(<SignatureCapture onClose={onClose} />)

    fireEvent.click(screen.getByTitle('Close (Esc)'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape and on a backdrop click, but not on a click inside the panel', () => {
    const onClose = vi.fn()
    const { container } = render(<SignatureCapture onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Draw' }))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    const backdrop = container.querySelector('.sign-modal-backdrop')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop as Element)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('switches between tabs (including Saved, once marks load) without crashing', async () => {
    render(<SignatureCapture onClose={vi.fn()} />)

    // The Draw tab mounts a <canvas> wired to signature_pad; jsdom has no real 2d
    // context, so this must not throw (the SignaturePad guard in SignatureCapture.tsx).
    expect(document.querySelector('canvas.sign-canvas')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Type' }))
    expect(screen.getByPlaceholderText('Type your name')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Upload' }))
    expect(screen.getByText('No file selected')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /^Saved/ }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Saved (1)' })).toBeTruthy()
    )
  })

  it('keeps Save disabled until the Type tab has non-blank text (blank guard)', () => {
    render(<SignatureCapture onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Type' }))

    const save = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement
    expect(save.disabled).toBe(true)

    fireEvent.change(screen.getByPlaceholderText('Type your name'), {
      target: { value: 'Ada Lovelace' }
    })
    expect(save.disabled).toBe(false)

    fireEvent.change(screen.getByPlaceholderText('Type your name'), {
      target: { value: '   ' }
    })
    expect(save.disabled).toBe(true)
  })

  it('Save on the Type tab persists a mark via useMarkLibrary and shows it under Saved', async () => {
    render(<SignatureCapture onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Type' }))
    fireEvent.change(screen.getByPlaceholderText('Type your name'), {
      target: { value: 'Ada Lovelace' }
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Saved (2)' })).toBeTruthy()
    )
    expect((window.api as unknown as { marks: { save: ReturnType<typeof vi.fn> } }).marks.save)
      .toHaveBeenCalledTimes(1)
  })
})
