import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMenuEvents, dispatchMenuEvent, type MenuEventHandlers } from './useMenuEvents'

const isTauriMock = vi.fn(() => false)
const listenMock = vi.fn()
const invokeMock = vi.fn().mockResolvedValue(undefined)

vi.mock('../mock-tauri', () => ({
  isTauri: () => isTauriMock(),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => listenMock(...args),
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}))

function makeHandlers(): MenuEventHandlers {
  return {
    onSetViewMode: vi.fn(),
    onCreateNote: vi.fn(),
    onQuickOpen: vi.fn(),
    onSave: vi.fn(),
    onOpenSettings: vi.fn(),
    onToggleBacklinks: vi.fn(),
    onCommandPalette: vi.fn(),
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onZoomReset: vi.fn(),
    onToggleOrganized: vi.fn(),
    onArchiveNote: vi.fn(),
    onDeleteNote: vi.fn(),
    onSearch: vi.fn(),
    onToggleRawEditor: vi.fn(),
    onPastePlainText: vi.fn(),
    onGoBack: vi.fn(),
    onGoForward: vi.fn(),
    onCheckForUpdates: vi.fn(),
    onSelectFilter: vi.fn(),
    onOpenVault: vi.fn(),
    onRemoveActiveVault: vi.fn(),
    onRestoreGettingStarted: vi.fn(),
    onReloadVault: vi.fn(),
    onRepairVault: vi.fn(),
    activeTabPathRef: { current: '/vault/test.md' } as React.MutableRefObject<string | null>,
    multiSelectionCommandRef: { current: null },
    activeTabPath: '/vault/test.md',
  }
}

describe('useMenuEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isTauriMock.mockReturnValue(false)
  })

  it('cleans up a native menu listener even if unmounted before listen resolves', async () => {
    isTauriMock.mockReturnValue(true)

    let resolveListen: ((teardown: () => void) => void) | null = null
    const teardown = vi.fn()

    listenMock.mockImplementationOnce(() => new Promise((resolve) => {
      resolveListen = resolve
    }))

    const { unmount } = renderHook(() => useMenuEvents(makeHandlers()))
    await vi.dynamicImportSettled()

    expect(listenMock).toHaveBeenCalledTimes(1)

    unmount()

    resolveListen?.(teardown)
    await vi.dynamicImportSettled()

    expect(teardown).toHaveBeenCalledTimes(1)
  })

  it('swallows stale native menu unlisten failures from dev-mode remounts', async () => {
    isTauriMock.mockReturnValue(true)
    const teardown = vi.fn(() => {
      throw new TypeError("undefined is not an object (evaluating 'listeners[eventId].handlerId')")
    })

    listenMock.mockResolvedValueOnce(teardown)

    const { unmount } = renderHook(() => useMenuEvents(makeHandlers()))
    await vi.dynamicImportSettled()

    expect(() => unmount()).not.toThrow()
    await vi.dynamicImportSettled()
    expect(teardown).toHaveBeenCalledTimes(1)
  })
})

describe('dispatchMenuEvent', () => {
  // View mode events
  it('view-editor-only sets editor-only mode', () => {
    const h = makeHandlers()
    dispatchMenuEvent('view-editor-only', h)
    expect(h.onSetViewMode).toHaveBeenCalledWith('editor-only')
  })

  it('view-editor-list sets editor-list mode', () => {
    const h = makeHandlers()
    dispatchMenuEvent('view-editor-list', h)
    expect(h.onSetViewMode).toHaveBeenCalledWith('editor-list')
  })

  it('view-all sets all mode', () => {
    const h = makeHandlers()
    dispatchMenuEvent('view-all', h)
    expect(h.onSetViewMode).toHaveBeenCalledWith('all')
  })

  // Simple handler events
  it('file-new-note triggers create note', () => {
    const h = makeHandlers()
    dispatchMenuEvent('file-new-note', h)
    expect(h.onCreateNote).toHaveBeenCalled()
  })

  it('file-daily-note is ignored once the command is removed', () => {
    const h = makeHandlers()
    dispatchMenuEvent('file-daily-note', h)
    expect(h.onCreateNote).not.toHaveBeenCalled()
    expect(h.onQuickOpen).not.toHaveBeenCalled()
  })

  it('file-quick-open triggers quick open', () => {
    const h = makeHandlers()
    dispatchMenuEvent('file-quick-open', h)
    expect(h.onQuickOpen).toHaveBeenCalled()
  })

  it('file-save triggers save', () => {
    const h = makeHandlers()
    dispatchMenuEvent('file-save', h)
    expect(h.onSave).toHaveBeenCalled()
  })

  it('app-settings triggers open settings', () => {
    const h = makeHandlers()
    dispatchMenuEvent('app-settings', h)
    expect(h.onOpenSettings).toHaveBeenCalled()
  })

  it('view-command-palette triggers command palette', () => {
    const h = makeHandlers()
    dispatchMenuEvent('view-command-palette', h)
    expect(h.onCommandPalette).toHaveBeenCalled()
  })

  it('view-zoom-in triggers zoom in', () => {
    const h = makeHandlers()
    dispatchMenuEvent('view-zoom-in', h)
    expect(h.onZoomIn).toHaveBeenCalled()
  })

  it('view-zoom-out triggers zoom out', () => {
    const h = makeHandlers()
    dispatchMenuEvent('view-zoom-out', h)
    expect(h.onZoomOut).toHaveBeenCalled()
  })

  it('view-zoom-reset triggers zoom reset', () => {
    const h = makeHandlers()
    dispatchMenuEvent('view-zoom-reset', h)
    expect(h.onZoomReset).toHaveBeenCalled()
  })

  it('edit-find-in-vault triggers search', () => {
    const h = makeHandlers()
    dispatchMenuEvent('edit-find-in-vault', h)
    expect(h.onSearch).toHaveBeenCalled()
  })

  // Active tab-dependent events
  it('note-delete triggers delete on active tab', () => {
    const h = makeHandlers()
    dispatchMenuEvent('note-delete', h)
    expect(h.onDeleteNote).toHaveBeenCalledWith('/vault/test.md')
  })

  it('note-delete uses the current multi-selection when available', () => {
    const h = makeHandlers()
    const deleteSelected = vi.fn()
    h.multiSelectionCommandRef.current = {
      selectedPaths: ['/vault/a.md', '/vault/b.md'],
      deleteSelected,
    }

    dispatchMenuEvent('note-delete', h)

    expect(deleteSelected).toHaveBeenCalledTimes(1)
    expect(h.onDeleteNote).not.toHaveBeenCalled()
  })

  it('note-delete does nothing when no active tab', () => {
    const h = makeHandlers()
    h.activeTabPathRef = { current: null }
    dispatchMenuEvent('note-delete', h)
    expect(h.onDeleteNote).not.toHaveBeenCalled()
  })

  // Optional handler events
  it('view-go-back triggers go back', () => {
    const h = makeHandlers()
    dispatchMenuEvent('view-go-back', h)
    expect(h.onGoBack).toHaveBeenCalled()
  })

  it('view-go-forward triggers go forward', () => {
    const h = makeHandlers()
    dispatchMenuEvent('view-go-forward', h)
    expect(h.onGoForward).toHaveBeenCalled()
  })

  it('app-check-for-updates triggers check for updates', () => {
    const h = makeHandlers()
    dispatchMenuEvent('app-check-for-updates', h)
    expect(h.onCheckForUpdates).toHaveBeenCalled()
  })

  // New Edit menu items
  it('edit-toggle-raw-editor triggers toggle raw editor', () => {
    const h = makeHandlers()
    dispatchMenuEvent('edit-toggle-raw-editor', h)
    expect(h.onToggleRawEditor).toHaveBeenCalled()
  })

  it('edit-paste-plain-text triggers plain-text paste', () => {
    const h = makeHandlers()
    dispatchMenuEvent('edit-paste-plain-text', h)
    expect(h.onPastePlainText).toHaveBeenCalled()
  })

  it('view-toggle-backlinks triggers the backlinks panel', () => {
    const h = makeHandlers()
    dispatchMenuEvent('view-toggle-backlinks', h)
    expect(h.onToggleBacklinks).toHaveBeenCalled()
  })

  // Go menu events
  it('go-all-notes selects all filter', () => {
    const h = makeHandlers()
    dispatchMenuEvent('go-all-notes', h)
    expect(h.onSelectFilter).toHaveBeenCalledWith('all')
  })

  // Vault menu events
  it('vault-open triggers open vault', () => {
    const h = makeHandlers()
    dispatchMenuEvent('vault-open', h)
    expect(h.onOpenVault).toHaveBeenCalled()
  })

  it('vault-remove triggers remove active vault', () => {
    const h = makeHandlers()
    dispatchMenuEvent('vault-remove', h)
    expect(h.onRemoveActiveVault).toHaveBeenCalled()
  })

  it('vault-restore-getting-started triggers restore', () => {
    const h = makeHandlers()
    dispatchMenuEvent('vault-restore-getting-started', h)
    expect(h.onRestoreGettingStarted).toHaveBeenCalled()
  })

  it('vault-reload triggers reload vault', () => {
    const h = makeHandlers()
    dispatchMenuEvent('vault-reload', h)
    expect(h.onReloadVault).toHaveBeenCalled()
  })

  it('vault-repair triggers repair vault', () => {
    const h = makeHandlers()
    dispatchMenuEvent('vault-repair', h)
    expect(h.onRepairVault).toHaveBeenCalled()
  })

  // Edge cases
  it('unknown event ID does nothing', () => {
    const h = makeHandlers()
    dispatchMenuEvent('unknown-event', h)
    expect(h.onSetViewMode).not.toHaveBeenCalled()
    expect(h.onCreateNote).not.toHaveBeenCalled()
    expect(h.onSave).not.toHaveBeenCalled()
  })
})
