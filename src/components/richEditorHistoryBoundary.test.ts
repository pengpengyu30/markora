import { BlockNoteEditor } from '@blocknote/core'
import { describe, expect, it } from 'vitest'
import { createRichEditorHistoryBoundary } from './richEditorHistoryBoundary'

describe('rich editor history boundary', () => {
  it('only exposes undo and redo operations created after the boundary', () => {
    const editor = BlockNoteEditor.create({
      initialContent: [{ type: 'paragraph', content: 'Document A' }],
    })
    const host = document.createElement('div')
    document.body.appendChild(host)
    const mountedEditor = editor as typeof editor & {
      mount: (element: HTMLElement) => void
      unmount: () => void
    }
    mountedEditor.mount(host)

    try {
      editor.updateBlock(editor.document[0], { content: 'Previous document edit' })
      expect(editor.undo()).toBe(true)
      expect(editor.redo()).toBe(true)

      const history = createRichEditorHistoryBoundary(editor, '/vault/document-b.md')

      expect(history.undo()).toBe(false)
      expect(history.redo()).toBe(false)

      editor.updateBlock(editor.document[0], { content: 'Current document edit' })
      expect(history.undo()).toBe(true)
      expect(history.redo()).toBe(true)
      expect(history.redo()).toBe(false)
    } finally {
      mountedEditor.unmount()
      host.remove()
    }
  })
})
