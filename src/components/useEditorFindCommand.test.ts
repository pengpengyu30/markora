import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useEditorFindCommand, type EditorFindCommandTab } from './useEditorFindCommand'

const tab: EditorFindCommandTab = {
  entry: {
    fileKind: 'markdown',
    path: '/vault/note.md',
  },
}

describe('useEditorFindCommand', () => {
  it('opens rendered find without switching to raw mode', () => {
    const findInNoteRef = { current: null as ((options?: { replace?: boolean }) => void) | null }
    const handleToggleRaw = vi.fn()
    const { result } = renderHook(() => useEditorFindCommand({
      activeTab: tab,
      findInNoteRef,
      handleToggleRawExclusive: handleToggleRaw,
      rawMode: false,
    }))

    act(() => findInNoteRef.current?.())

    expect(handleToggleRaw).not.toHaveBeenCalled()
    expect(result.current).toMatchObject({
      path: tab.entry.path,
      replace: false,
    })
  })

  it('keeps replace routed to raw mode', () => {
    const findInNoteRef = { current: null as ((options?: { replace?: boolean }) => void) | null }
    const handleToggleRaw = vi.fn()
    renderHook(() => useEditorFindCommand({
      activeTab: tab,
      findInNoteRef,
      handleToggleRawExclusive: handleToggleRaw,
      rawMode: false,
    }))

    act(() => findInNoteRef.current?.({ replace: true }))

    expect(handleToggleRaw).toHaveBeenCalledOnce()
  })
})
