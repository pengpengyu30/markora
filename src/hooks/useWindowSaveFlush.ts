import { useEffect, useRef } from 'react'
import { isTauri } from '../mock-tauri'

type FlushCallback = () => Promise<void> | void

function reportFlushFailure(error: unknown): void {
  console.warn('Failed to flush editor content before the window lost focus:', error)
}

/** Flush the active editor before the browser/native window leaves the foreground. */
export function useWindowSaveFlush(flush: FlushCallback): void {
  const flushRef = useRef(flush)
  const closeInProgressRef = useRef(false)

  useEffect(() => {
    flushRef.current = flush
  }, [flush])

  useEffect(() => {
    const runFlush = () => {
      void Promise.resolve(flushRef.current()).catch(reportFlushFailure)
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') runFlush()
    }

    window.addEventListener('blur', runFlush)
    window.addEventListener('beforeunload', runFlush)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('blur', runFlush)
      window.removeEventListener('beforeunload', runFlush)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (!isTauri()) return

    let disposed = false
    let unlisten: (() => void) | null = null

    void import('@tauri-apps/api/window')
      .then(async ({ getCurrentWindow }) => {
        if (disposed) return
        const appWindow = getCurrentWindow()
        if (typeof appWindow.onCloseRequested !== 'function') return

        unlisten = await appWindow.onCloseRequested(async (event) => {
          if (closeInProgressRef.current) {
            event.preventDefault()
            return
          }

          closeInProgressRef.current = true
          try {
            await flushRef.current()
          } catch (error) {
            event.preventDefault()
            reportFlushFailure(error)
          } finally {
            closeInProgressRef.current = false
          }
        })
      })
      .catch(reportFlushFailure)

    return () => {
      disposed = true
      unlisten?.()
    }
  }, [])
}
