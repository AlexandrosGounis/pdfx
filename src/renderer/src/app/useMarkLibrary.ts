// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useState } from 'react'
import type { MarkAsset } from '../pdfx/sign/types'

// The save input: everything except the store-assigned id + createdAt.
export type MarkInput = Omit<MarkAsset, 'id' | 'createdAt'>

interface MarkLibrary {
  marks: MarkAsset[]
  loading: boolean
  error: string | null
  save(input: MarkInput): Promise<MarkAsset | null>
  remove(id: string): Promise<void>
  reload(): Promise<void>
}

export function useMarkLibrary(): MarkLibrary {
  const [marks, setMarks] = useState<MarkAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const list = (await window.api.marks.list()) as MarkAsset[]
      setMarks(list)
      setError(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useCallback(async (input: MarkInput): Promise<MarkAsset | null> => {
    try {
      const created = (await window.api.marks.save(input)) as MarkAsset
      setMarks((prev) => [...prev, created])
      setError(null)
      return created
    } catch (e) {
      setError(String(e))
      return null
    }
  }, [])

  const remove = useCallback(async (id: string): Promise<void> => {
    try {
      await window.api.marks.remove(id)
      setMarks((prev) => prev.filter((m) => m.id !== id))
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }, [])

  return { marks, loading, error, save, remove, reload }
}
