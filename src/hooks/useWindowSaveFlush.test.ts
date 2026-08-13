import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWindowSaveFlush } from './useWindowSaveFlush'

const tauriMode = vi.hoisted(() => ({ enabled: false }))
const tauriWindow = vi.hoisted(() => ({
  destroy: vi.fn().mockResolvedValue(undefined),
  onCloseRequested: vi.fn(),
}))
let closeRequestedHandler: ((event: { preventDefault: () => void }) => Promise<void>) | null = null

vi.mock('../mock-tauri', () => ({
  isTauri: () => tauriMode.enabled,
}))

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => tauriWindow,
}))

describe('useWindowSaveFlush', () => {
  afterEach(() => {
    tauriMode.enabled = false
    closeRequestedHandler = null
    tauriWindow.destroy.mockClear()
    tauriWindow.onCloseRequested.mockReset()
    vi.restoreAllMocks()
  })

  it('flushes when the window blurs', async () => {
    const flush = vi.fn().mockResolvedValue(undefined)
    renderHook(() => useWindowSaveFlush(flush))

    await act(async () => {
      window.dispatchEvent(new Event('blur'))
      await Promise.resolve()
    })

    expect(flush).toHaveBeenCalledOnce()
  })

  it('flushes when the document becomes hidden', async () => {
    const flush = vi.fn().mockResolvedValue(undefined)
    const visibilityState = Object.getOwnPropertyDescriptor(document, 'visibilityState')
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })

    try {
      renderHook(() => useWindowSaveFlush(flush))

      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'))
        await Promise.resolve()
      })

      expect(flush).toHaveBeenCalledOnce()
    } finally {
      if (visibilityState) Object.defineProperty(document, 'visibilityState', visibilityState)
    }
  })

  it('does not flush after unmount', async () => {
    const flush = vi.fn().mockResolvedValue(undefined)
    const { unmount } = renderHook(() => useWindowSaveFlush(flush))
    unmount()

    await act(async () => {
      window.dispatchEvent(new Event('blur'))
      await Promise.resolve()
    })

    expect(flush).not.toHaveBeenCalled()
  })

  it('allows the native close request after a successful flush', async () => {
    tauriMode.enabled = true
    tauriWindow.onCloseRequested.mockImplementation(async (handler) => {
      closeRequestedHandler = handler
      return vi.fn()
    })
    const flush = vi.fn().mockResolvedValue(undefined)
    renderHook(() => useWindowSaveFlush(flush))

    await waitFor(() => expect(closeRequestedHandler).toEqual(expect.any(Function)))
    const preventDefault = vi.fn()

    await act(async () => {
      await closeRequestedHandler?.({ preventDefault })
    })

    expect(flush).toHaveBeenCalledOnce()
    expect(preventDefault).not.toHaveBeenCalled()
    expect(tauriWindow.destroy).not.toHaveBeenCalled()
  })

  it('blocks the native close request when flushing fails', async () => {
    tauriMode.enabled = true
    tauriWindow.onCloseRequested.mockImplementation(async (handler) => {
      closeRequestedHandler = handler
      return vi.fn()
    })
    const flush = vi.fn().mockRejectedValue(new Error('Disk full'))
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderHook(() => useWindowSaveFlush(flush))

    await waitFor(() => expect(closeRequestedHandler).toEqual(expect.any(Function)))
    const preventDefault = vi.fn()

    await act(async () => {
      await closeRequestedHandler?.({ preventDefault })
    })

    expect(preventDefault).toHaveBeenCalledOnce()
    expect(tauriWindow.destroy).not.toHaveBeenCalled()
    expect(warning).toHaveBeenCalledWith(
      'Failed to flush editor content before the window lost focus:',
      expect.any(Error),
    )
  })
})
