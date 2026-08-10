import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRegisterEditorContentFlushes } from './editorContentFlushRegistration'

function renderFlushRegistration(options: {
  activeTab: Parameters<typeof useRegisterEditorContentFlushes>[0]['activeTab']
  flushPendingEditorChange: () => boolean
}) {
  const flushPendingEditorContentRef = { current: null as ((path: string) => void) | null }
  renderHook(() => useRegisterEditorContentFlushes({
    activeTab: options.activeTab,
    flushPendingEditorChange: options.flushPendingEditorChange,
    flushPendingEditorContentRef,
    rawLatestContentRef: { current: null },
    rawMode: false,
  }))
  return flushPendingEditorContentRef
}

describe('useRegisterEditorContentFlushes', () => {
  it('flushes legacy unsupported notes through the rich editor path', () => {
    const flushRichEditor = vi.fn(() => true)
    const flushPendingEditorContentRef = renderFlushRegistration({
      activeTab: {
        entry: { path: '/vault/model.md', display: 'sheet' },
        content: '---\n_display: sheet\n---\nMetric,January\nRevenue,1200',
      },
      flushPendingEditorChange: flushRichEditor,
    })

    act(() => {
      flushPendingEditorContentRef.current?.('/vault/model.md')
    })

    expect(flushRichEditor).toHaveBeenCalledTimes(1)
  })

  it('flushes text notes through the rich editor', () => {
    const flushRichEditor = vi.fn(() => true)
    const flushPendingEditorContentRef = renderFlushRegistration({
      activeTab: {
        entry: { path: '/vault/note.md', display: 'text' },
        content: '---\n_display: text\n---\n# Note',
      },
      flushPendingEditorChange: flushRichEditor,
    })

    act(() => {
      flushPendingEditorContentRef.current?.('/vault/note.md')
    })

    expect(flushRichEditor).toHaveBeenCalledTimes(1)
  })
})
