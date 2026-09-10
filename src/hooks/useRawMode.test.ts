import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { PROJECT_EDITOR_MODE_STORAGE_KEY, useRawMode } from './useRawMode'
import * as store from '../utils/vaultConfigStore'

describe('useRawMode', () => {
  let onFlushPending: ReturnType<typeof vi.fn>
  let projectStorage: Record<string, string>

  beforeEach(() => {
    onFlushPending = vi.fn().mockResolvedValue(true)
    projectStorage = {}
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => projectStorage[key] ?? null,
        setItem: (key: string, value: string) => { projectStorage[key] = value },
      },
    })
    // Reset vault config to defaults before each test
    store.resetVaultConfigStore()
    store.bindVaultConfigStore(
      { zoom: null, view_mode: null, editor_mode: null },
      vi.fn(),
    )
    window.localStorage.setItem(PROJECT_EDITOR_MODE_STORAGE_KEY, '')
  })

  afterEach(() => {
    window.localStorage.setItem(PROJECT_EDITOR_MODE_STORAGE_KEY, '')
    store.resetVaultConfigStore()
  })

  function renderRawHook(
    activeTabPath: string | null = '/note.md',
    projectPath?: string,
  ) {
    return renderHook(
      ({ path, project }) => useRawMode({
        activeTabPath: path,
        onFlushPending,
        projectPath: project,
      }),
      { initialProps: { path: activeTabPath, project: projectPath } },
    )
  }

  it('starts with rich preview when no editor preference has been selected', () => {
    const { result } = renderRawHook()
    expect(result.current.rawMode).toBe(false)
  })

  it('toggles raw mode on', async () => {
    const { result } = renderRawHook()

    await act(async () => { await result.current.handleToggleRaw() })

    expect(result.current.rawMode).toBe(true)
  })

  it('flushes pending edits when activating raw mode', async () => {
    const { result } = renderRawHook()

    await act(async () => { await result.current.handleToggleRaw() })

    expect(onFlushPending).toHaveBeenCalledOnce()
  })

  it('does not flush pending edits when deactivating raw mode', async () => {
    const { result } = renderRawHook()

    await act(async () => { await result.current.handleToggleRaw() })
    onFlushPending.mockClear()

    await act(async () => { await result.current.handleToggleRaw() })

    expect(onFlushPending).not.toHaveBeenCalled()
  })

  it('toggles raw mode off when already on', async () => {
    const { result } = renderRawHook()

    await act(async () => { await result.current.handleToggleRaw() })
    expect(result.current.rawMode).toBe(true)

    await act(async () => { await result.current.handleToggleRaw() })
    expect(result.current.rawMode).toBe(false)
  })

  it('persists raw mode across tab switches', async () => {
    const { result, rerender } = renderRawHook('/note-a.md')

    await act(async () => { await result.current.handleToggleRaw() })
    expect(result.current.rawMode).toBe(true)

    rerender({ path: '/note-b.md' })
    expect(result.current.rawMode).toBe(true)
  })

  it('works without onFlushPending callback', async () => {
    const { result } = renderHook(() => useRawMode({ activeTabPath: '/note.md' }))

    await act(async () => { await result.current.handleToggleRaw() })

    expect(result.current.rawMode).toBe(true)
  })

  it('does not activate raw mode when activeTabPath is null', async () => {
    const { result } = renderRawHook(null)

    await act(async () => { await result.current.handleToggleRaw() })

    // rawMode is false because there's no active tab, even though preference is enabled
    expect(result.current.rawMode).toBe(false)
  })

  it('calls onBeforeRawEnd when deactivating raw mode', async () => {
    const onBeforeRawEnd = vi.fn()
    const { result } = renderHook(
      ({ path }) => useRawMode({ activeTabPath: path, onFlushPending, onBeforeRawEnd }),
      { initialProps: { path: '/note.md' } },
    )

    await act(async () => { await result.current.handleToggleRaw() })
    expect(result.current.rawMode).toBe(true)

    await act(async () => { await result.current.handleToggleRaw() })

    expect(onBeforeRawEnd).toHaveBeenCalledOnce()
    expect(result.current.rawMode).toBe(false)
  })

  it('does not call onBeforeRawEnd when activating raw mode', async () => {
    const onBeforeRawEnd = vi.fn()
    const { result } = renderHook(
      ({ path }) => useRawMode({ activeTabPath: path, onFlushPending, onBeforeRawEnd }),
      { initialProps: { path: '/note.md' } },
    )

    await act(async () => { await result.current.handleToggleRaw() })

    expect(onBeforeRawEnd).not.toHaveBeenCalled()
  })

  it('persists editor_mode to vault config on toggle', async () => {
    const saveFn = vi.fn()
    store.resetVaultConfigStore()
    store.bindVaultConfigStore(
      { zoom: null, view_mode: null, editor_mode: 'preview' },
      saveFn,
    )

    const { result } = renderRawHook()

    await act(async () => { await result.current.handleToggleRaw() })
    expect(store.getVaultConfig().editor_mode).toBe('raw')

    await act(async () => { await result.current.handleToggleRaw() })
    expect(store.getVaultConfig().editor_mode).toBe('preview')
  })

  it('restores raw mode from vault config on init', () => {
    store.resetVaultConfigStore()
    store.bindVaultConfigStore(
      { zoom: null, view_mode: null, editor_mode: 'raw' },
      vi.fn(),
    )

    const { result } = renderRawHook()
    expect(result.current.rawMode).toBe(true)
  })

  it('defaults a Project to rich preview instead of inheriting the global Raw preference', () => {
    store.resetVaultConfigStore()
    store.bindVaultConfigStore(
      { zoom: null, view_mode: null, editor_mode: 'raw' },
      vi.fn(),
    )
    const { result } = renderRawHook('/project-a/note.md', '/project-a')

    expect(result.current.rawMode).toBe(false)
  })

  it('persists an explicit Raw choice per Project without leaking it to another Project', async () => {
    const { result, rerender } = renderHook(
      ({ path, project }) => useRawMode({
        activeTabPath: path,
        onFlushPending,
        projectPath: project,
      }),
      { initialProps: { path: '/project-a/note.md', project: '/project-a' } },
    )

    await act(async () => { await result.current.handleToggleRaw() })
    expect(result.current.rawMode).toBe(true)

    rerender({ path: '/project-b/note.md', project: '/project-b' })
    expect(result.current.rawMode).toBe(false)

    rerender({ path: '/project-a/note.md', project: '/project-a' })
    expect(result.current.rawMode).toBe(true)
  })
})
