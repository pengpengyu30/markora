import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModifiedFile, VaultEntry } from '../../types'
import {
  useChangeStatusResolver,
  useMultiSelectKeyboard,
  useNoteListInteractions,
  useNoteListSearch,
  useNoteListSort,
} from './noteListHooks'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

const {
  multiSelectState,
  noteListKeyboardState,
  prefetchNoteContentMock,
  routeNoteClickMock,
} = vi.hoisted(() => ({
  multiSelectState: {
    clear: vi.fn(),
    selectAll: vi.fn(),
    selectRange: vi.fn(),
    setAnchor: vi.fn(),
    isMultiSelecting: false,
  },
  noteListKeyboardState: {
    highlightedPath: null as string | null,
    handleKeyDown: vi.fn(),
    lastOptions: null as null | Record<string, unknown>,
  },
  prefetchNoteContentMock: vi.fn(),
  routeNoteClickMock: vi.fn(),
}))

vi.mock('../../hooks/useMultiSelect', () => ({
  useMultiSelect: () => multiSelectState,
}))

vi.mock('../../hooks/useNoteListKeyboard', () => ({
  useNoteListKeyboard: (options: Record<string, unknown>) => {
    noteListKeyboardState.lastOptions = options
    return {
      highlightedPath: noteListKeyboardState.highlightedPath,
      handleKeyDown: noteListKeyboardState.handleKeyDown,
    }
  },
}))

vi.mock('../../hooks/useTabManagement', () => ({
  prefetchNoteContent: (entry: VaultEntry) => prefetchNoteContentMock(entry),
}))

vi.mock('./noteListUtils', async () => {
  const actual = await vi.importActual<typeof import('./noteListUtils')>('./noteListUtils')
  return {
    ...actual,
    routeNoteClick: (...args: unknown[]) => routeNoteClickMock(...args),
  }
})

function makeEntry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/vault/note/a.md',
    filename: 'a.md',
    title: 'Alpha',
    isA: 'Project',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: 'Active',
    archived: false,
    modifiedAt: 1,
    createdAt: 1,
    fileSize: 100,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    properties: {},
    hasH1: true,
    fileKind: 'markdown',
    ...overrides,
  }
}

function makeDeletedEntry(): VaultEntry {
  return makeEntry({
    path: '/vault/note/deleted.md',
    filename: 'deleted.md',
    title: 'Deleted',
    __deletedNotePreview: true,
    __deletedRelativePath: 'note/deleted.md',
    __changeAddedLines: 0,
    __changeDeletedLines: 4,
    __changeBinary: false,
  } as Partial<VaultEntry>)
}

describe('noteListHooks extra', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    multiSelectState.isMultiSelecting = false
    noteListKeyboardState.highlightedPath = null
    noteListKeyboardState.lastOptions = null
    routeNoteClickMock.mockImplementation((
      entry: VaultEntry,
      _event: unknown,
      actions: { onReplace: (value: VaultEntry) => void },
    ) => {
      actions.onReplace(entry)
    })
  })

  it('toggles search visibility and clears the search when closing it', () => {
    const { result } = renderHook(() => useNoteListSearch())

    act(() => {
      result.current.toggleSearch()
      result.current.setSearch('  HELLO  ')
    })

    expect(result.current.searchVisible).toBe(true)
    expect(result.current.query).toBe('hello')

    act(() => {
      result.current.toggleSearch()
    })

    expect(result.current.searchVisible).toBe(false)
    expect(result.current.search).toBe('')
  })

  it('stores list sorting locally when no persistence target is available', () => {
    const { result } = renderHook(() =>
      useNoteListSort(),
    )

    act(() => {
      result.current.handleSortChange('__list__', 'title', 'asc')
    })

    expect(result.current.sortPrefs.__list__).toEqual({ option: 'title', direction: 'asc' })
  })

  it('handles keyboard shortcuts for multi-select flows and ignores select-all in focused inputs', () => {
    const onDelete = vi.fn()

    multiSelectState.isMultiSelecting = true
    renderHook(() => useMultiSelectKeyboard(multiSelectState as never, onDelete))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }))
    })
    expect(multiSelectState.clear).toHaveBeenCalled()

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'a',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }))
    })
    expect(multiSelectState.selectAll).not.toHaveBeenCalled()

    input.blur()
    input.remove()

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'a',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }))
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Delete',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }))
    })

    expect(multiSelectState.selectAll).toHaveBeenCalledOnce()
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('matches change status by relative path suffix and returns undefined outside the changes view', () => {
    const modifiedFiles: ModifiedFile[] = [
      { path: '/vault/changes/note/alpha.md', relativePath: 'note/alpha.md', status: 'deleted' },
    ]

    const enabled = renderHook(() => useChangeStatusResolver(true, modifiedFiles))
    expect(enabled.result.current('/mirror/worktree/note/alpha.md')).toBe('deleted')

    const disabled = renderHook(() => useChangeStatusResolver(false, modifiedFiles))
    expect(disabled.result.current('/vault/changes/note/alpha.md')).toBeUndefined()
  })

  it('returns undefined for change-status lookups that do not match any modified file', () => {
    const modifiedFiles: ModifiedFile[] = [
      { path: '/vault/note/a.md', relativePath: 'note/a.md', status: 'modified' },
    ]
    const { result } = renderHook(() => useChangeStatusResolver(true, modifiedFiles))

    expect(result.current('/vault/note/a.md')).toBe('modified')
    expect(result.current('/vault/note/missing.md')).toBeUndefined()
  })

  it('routes deleted-note interactions through the deleted preview handlers and auto-triggers diffs for live changes', () => {
    vi.useFakeTimers()
    const deletedEntry = makeDeletedEntry()
    const liveEntry = makeEntry({ path: '/vault/note/live.md', filename: 'live.md', title: 'Live' })
    const imageEntry = makeEntry({
      path: '/vault/assets/photo.png',
      filename: 'photo.png',
      title: 'photo.png',
      fileKind: 'binary',
    })
    const onReplaceActiveTab = vi.fn()
    const onOpenDeletedNote = vi.fn()
    const onAutoTriggerDiff = vi.fn()

    const { result } = renderHook(() =>
      useNoteListInteractions({
        searched: [deletedEntry, liveEntry],
        selectedNotePath: deletedEntry.path,
        selection: { kind: 'filter', filter: 'changes' },
        isChangesView: true,
        searchVisible: false,
        toggleSearch: vi.fn(),
        onReplaceActiveTab,
        onOpenDeletedNote,
        onAutoTriggerDiff,
        openContextMenuForEntry: vi.fn(),
        onCreateNote: vi.fn(),
      }),
    )

    const keyboardOptions = noteListKeyboardState.lastOptions as {
      onOpen: (entry: VaultEntry) => void
      onPrefetch: (entry: VaultEntry) => void
    }

    act(() => {
      keyboardOptions.onOpen(deletedEntry)
      keyboardOptions.onPrefetch(liveEntry)
      keyboardOptions.onPrefetch(imageEntry)
      result.current.handleClickNote(deletedEntry, {} as React.MouseEvent)
      result.current.handleClickNote(liveEntry, {} as React.MouseEvent)
      vi.advanceTimersByTime(50)
    })

    expect(onOpenDeletedNote).toHaveBeenCalledWith(deletedEntry)
    expect(onReplaceActiveTab).toHaveBeenCalledWith(liveEntry)
    expect(onAutoTriggerDiff).toHaveBeenCalledOnce()
    expect(prefetchNoteContentMock).toHaveBeenCalledWith(liveEntry)
    expect(prefetchNoteContentMock).not.toHaveBeenCalledWith(imageEntry)

    vi.useRealTimers()
  })

})
