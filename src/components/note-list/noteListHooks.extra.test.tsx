import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../../types'
import {
  useMultiSelectKeyboard,
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


})
