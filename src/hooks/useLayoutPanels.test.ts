import { beforeEach, describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLayoutPanels, COLUMN_MIN_WIDTHS } from './useLayoutPanels'
import { APP_STORAGE_KEYS, LEGACY_APP_STORAGE_KEYS } from '../constants/appStorage'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

type ExpectedPanelWidths = {
  sidebar: number
  noteList: number
  rightPanel: number
}

function storePanelWidths(key: string, widths: ExpectedPanelWidths): void {
  localStorage.setItem(key, JSON.stringify(widths))
}

function expectPanelWidths(
  result: { current: ReturnType<typeof useLayoutPanels> },
  widths: ExpectedPanelWidths,
): void {
  expect(result.current.sidebarWidth).toBe(widths.sidebar)
  expect(result.current.noteListWidth).toBe(widths.noteList)
  expect(result.current.rightPanelWidth).toBe(widths.rightPanel)
}

describe('useLayoutPanels', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('exports column minimum widths', () => {
    expect(COLUMN_MIN_WIDTHS.sidebar).toBe(220)
    expect(COLUMN_MIN_WIDTHS.noteList).toBe(220)
    expect(COLUMN_MIN_WIDTHS.editor).toBe(800)
    expect(COLUMN_MIN_WIDTHS.rightPanel).toBe(240)
  })

  it('returns default widths', () => {
    const { result } = renderHook(() => useLayoutPanels())
    expectPanelWidths(result, { sidebar: 250, noteList: 300, rightPanel: 280 })
  })

  it('clamps sidebar resize to minimum', () => {
    const { result } = renderHook(() => useLayoutPanels())
    act(() => result.current.handleSidebarResize(-500))
    expect(result.current.sidebarWidth).toBe(COLUMN_MIN_WIDTHS.sidebar)
  })

  it('clamps note list resize to minimum', () => {
    const { result } = renderHook(() => useLayoutPanels())
    act(() => result.current.handleNoteListResize(-500))
    expect(result.current.noteListWidth).toBe(COLUMN_MIN_WIDTHS.noteList)
  })

  it('clamps right panel resize to minimum', () => {
    const { result } = renderHook(() => useLayoutPanels())
    act(() => result.current.handleRightPanelResize(500))
    expect(result.current.rightPanelWidth).toBe(COLUMN_MIN_WIDTHS.rightPanel)
  })

  it('clamps sidebar resize to maximum', () => {
    const { result } = renderHook(() => useLayoutPanels())
    act(() => result.current.handleSidebarResize(500))
    expect(result.current.sidebarWidth).toBe(400)
  })

  it('clamps note list resize to maximum', () => {
    const { result } = renderHook(() => useLayoutPanels())
    act(() => result.current.handleNoteListResize(500))
    expect(result.current.noteListWidth).toBe(500)
  })

  it('clamps right panel resize to maximum', () => {
    const { result } = renderHook(() => useLayoutPanels())
    act(() => result.current.handleRightPanelResize(-500))
    expect(result.current.rightPanelWidth).toBe(500)
  })

  it('defaults right panel to collapsed', () => {
    const { result } = renderHook(() => useLayoutPanels())
    expect(result.current.rightPanelCollapsed).toBe(true)
  })

  it('restores the last persisted right panel visibility', () => {
    localStorage.setItem(APP_STORAGE_KEYS.rightPanelCollapsed, 'false')

    const { result } = renderHook(() => useLayoutPanels())

    expect(result.current.rightPanelCollapsed).toBe(false)
  })

  it('persists right panel visibility changes for the next main-window launch', () => {
    const { result, unmount } = renderHook(() => useLayoutPanels())

    act(() => result.current.setRightPanelCollapsed(false))
    expect(localStorage.getItem(APP_STORAGE_KEYS.rightPanelCollapsed)).toBe('false')

    unmount()
    const restored = renderHook(() => useLayoutPanels())
    expect(restored.result.current.rightPanelCollapsed).toBe(false)
  })

  it('keeps auxiliary-window overrides from replacing the persisted main-window state', () => {
    localStorage.setItem(APP_STORAGE_KEYS.rightPanelCollapsed, 'false')

    const { result } = renderHook(() => useLayoutPanels({ initialRightPanelCollapsed: true }))

    expect(result.current.rightPanelCollapsed).toBe(true)
    expect(localStorage.getItem(APP_STORAGE_KEYS.rightPanelCollapsed)).toBe('false')
  })

  it('defaults right panel to collapsed when persisted visibility is invalid', () => {
    localStorage.setItem(APP_STORAGE_KEYS.rightPanelCollapsed, 'sometimes')

    const { result } = renderHook(() => useLayoutPanels())

    expect(result.current.rightPanelCollapsed).toBe(true)
  })

  it('accepts initial right panel collapsed override', () => {
    const { result } = renderHook(() => useLayoutPanels({ initialRightPanelCollapsed: false }))
    expect(result.current.rightPanelCollapsed).toBe(false)
  })

  it('restores persisted panel widths', () => {
    storePanelWidths(APP_STORAGE_KEYS.layoutPanels, {
      sidebar: 280,
      noteList: 360,
      rightPanel: 320,
    })

    const { result } = renderHook(() => useLayoutPanels())

    expectPanelWidths(result, { sidebar: 280, noteList: 360, rightPanel: 320 })
  })

  it('clamps persisted panel widths to supported ranges', () => {
    storePanelWidths(APP_STORAGE_KEYS.layoutPanels, {
      sidebar: 120,
      noteList: 700,
      rightPanel: 90,
    })

    const { result } = renderHook(() => useLayoutPanels())

    expectPanelWidths(result, {
      sidebar: COLUMN_MIN_WIDTHS.sidebar,
      noteList: 500,
      rightPanel: COLUMN_MIN_WIDTHS.rightPanel,
    })
  })

  it('falls back to defaults when persisted panel widths are malformed', () => {
    localStorage.setItem(APP_STORAGE_KEYS.layoutPanels, '{not json')

    const { result } = renderHook(() => useLayoutPanels())

    expectPanelWidths(result, { sidebar: 250, noteList: 300, rightPanel: 280 })
  })

  it('persists resized panel widths with the Tolaria storage key', () => {
    storePanelWidths(LEGACY_APP_STORAGE_KEYS.layoutPanels, {
      sidebar: 260,
      noteList: 340,
      rightPanel: 300,
    })

    const { result } = renderHook(() => useLayoutPanels())
    act(() => result.current.handleSidebarResize(24))

    expect(JSON.parse(localStorage.getItem(APP_STORAGE_KEYS.layoutPanels) ?? '{}')).toEqual({
      sidebar: 284,
      noteList: 340,
      rightPanel: 300,
    })
    expect(localStorage.getItem(LEGACY_APP_STORAGE_KEYS.layoutPanels)).toBeNull()
  })

  it('keeps the resized right panel width across close and reopen toggles', () => {
    const { result } = renderHook(() => useLayoutPanels({ initialRightPanelCollapsed: false }))

    act(() => result.current.handleRightPanelResize(-70))
    expect(result.current.rightPanelWidth).toBe(350)

    act(() => result.current.setRightPanelCollapsed(true))
    act(() => result.current.setRightPanelCollapsed(false))

    expect(result.current.rightPanelWidth).toBe(350)
  })
})
