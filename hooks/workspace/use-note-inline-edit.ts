'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useNoteInlineEdit({
  initialMarkdown,
  onSave,
  debounceMs = 900,
}: {
  initialMarkdown: string
  onSave: (markdown: string) => Promise<boolean>
  debounceMs?: number
}) {
  const [markdown, setMarkdownState] = useState(initialMarkdown)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const lastSavedRef = useRef(initialMarkdown)
  const latestMarkdownRef = useRef(initialMarkdown)
  const inflightSaveRef = useRef<Promise<boolean> | null>(null)
  const debounceTimerRef = useRef<number | null>(null)
  const needsResaveRef = useRef(false)

  const clearDebounceTimer = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    clearDebounceTimer()
    setMarkdownState(initialMarkdown)
    lastSavedRef.current = initialMarkdown
    latestMarkdownRef.current = initialMarkdown
    needsResaveRef.current = false
    setStatus('idle')
    setErrorMessage(null)
  }, [clearDebounceTimer, initialMarkdown])

  useEffect(() => clearDebounceTimer, [clearDebounceTimer])

  const setMarkdown = useCallback((nextMarkdown: string) => {
    latestMarkdownRef.current = nextMarkdown
    if (inflightSaveRef.current) {
      needsResaveRef.current = true
    }

    setMarkdownState(nextMarkdown)
    setErrorMessage(null)
    setStatus((current) => (current === 'saved' || current === 'error' ? 'idle' : current))
  }, [])

  const isDirty = useMemo(() => markdown !== lastSavedRef.current, [markdown])

  const saveNow = useCallback(async () => {
    clearDebounceTimer()

    if (!isDirty) {
      return false
    }

    if (inflightSaveRef.current) {
      return inflightSaveRef.current
    }

    const snapshot = latestMarkdownRef.current
    setStatus('saving')
    setErrorMessage(null)

    const request = (async () => {
      let saved = false

      try {
        saved = await onSave(snapshot)
        if (!saved) {
          setStatus('error')
          setErrorMessage('保存失败，请重试。')
          return false
        }

        lastSavedRef.current = snapshot
        setStatus('saved')
        return true
      } catch (error) {
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : '保存失败，请重试。')
        return false
      } finally {
        inflightSaveRef.current = null

        if (saved && needsResaveRef.current && latestMarkdownRef.current !== lastSavedRef.current) {
          needsResaveRef.current = false
          queueMicrotask(() => {
            void saveNowRef.current()
          })
        }
      }
    })()

    inflightSaveRef.current = request
    return request
  }, [clearDebounceTimer, isDirty, markdown, onSave])

  const saveNowRef = useRef(saveNow)

  useEffect(() => {
    saveNowRef.current = saveNow
  }, [saveNow])

  useEffect(() => {
    if (!isDirty) {
      clearDebounceTimer()
      return
    }

    clearDebounceTimer()
    debounceTimerRef.current = window.setTimeout(() => {
      void saveNowRef.current()
    }, debounceMs)
  }, [clearDebounceTimer, debounceMs, isDirty, markdown])

  return {
    markdown,
    setMarkdown,
    isDirty,
    status,
    errorMessage,
    saveNow,
  }
}
