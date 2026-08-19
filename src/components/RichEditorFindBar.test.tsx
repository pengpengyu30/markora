import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Schema } from '@tiptap/pm/model'
import { EditorState } from '@tiptap/pm/state'
import { EditorView } from '@tiptap/pm/view'
import { describe, expect, it, vi } from 'vitest'
import { RichEditorFindBar } from './RichEditorFindBar'
import { createRichEditorFindPlugin, type RichEditorFindEditor } from './richEditorFindExtension'

const schema = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: { content: 'text*', toDOM: () => ['p', 0] },
    text: { group: 'inline' },
  },
})

function renderFindBar(text: string, overrides: Partial<React.ComponentProps<typeof RichEditorFindBar>> = {}) {
  const host = document.createElement('div')
  const doc = schema.node('doc', null, [schema.node('paragraph', null, schema.text(text))])
  const view = new EditorView(host, {
    state: EditorState.create({
      doc,
      plugins: [createRichEditorFindPlugin()],
    }),
  })
  const editor: RichEditorFindEditor = { _tiptapEditor: { view } }
  const props = {
    editor,
    locale: 'en' as const,
    onClose: vi.fn(),
    open: true,
    path: '/vault/note.md',
    request: { id: 1, path: '/vault/note.md', replace: false },
    ...overrides,
  }

  const rendered = render(<RichEditorFindBar {...props} />)
  return { ...rendered, editor, props, view }
}

describe('RichEditorFindBar', () => {
  it('navigates rendered matches without switching editor modes', async () => {
    const { view } = renderFindBar('Alpha beta Alpha')
    const input = screen.getByTestId('rich-editor-find-input')

    fireEvent.change(input, { target: { value: 'Alpha' } })

    await waitFor(() => {
      expect(screen.getByTestId('rich-editor-find-count')).toHaveTextContent('1 / 2')
      expect(view.dom.querySelector('.markora-rich-editor-find-match-active')).toHaveTextContent('Alpha')
    })

    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByTestId('rich-editor-find-count')).toHaveTextContent('2 / 2')
      expect(view.state.selection.from).toBe(12)
    })

    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    await waitFor(() => expect(screen.getByTestId('rich-editor-find-count')).toHaveTextContent('1 / 2'))
    view.destroy()
  })

  it('shows a raw-mode syntax hint when rendered text has no Markdown delimiters', async () => {
    renderFindBar('Bold text')
    fireEvent.change(screen.getByTestId('rich-editor-find-input'), { target: { value: '**' } })

    await waitFor(() => {
      expect(screen.getByTestId('rich-editor-find-count')).toHaveTextContent('No matches')
      expect(screen.getByTestId('rich-editor-find-count')).toHaveTextContent('searchable in Raw mode')
    })
  })

  it('clears decorations before closing', async () => {
    const onClose = vi.fn()
    const { view } = renderFindBar('Alpha', { onClose })
    fireEvent.change(screen.getByTestId('rich-editor-find-input'), { target: { value: 'Alpha' } })
    await waitFor(() => expect(view.dom.querySelector('.markora-rich-editor-find-match-active')).toBeTruthy())

    fireEvent.keyDown(screen.getByTestId('rich-editor-find-input'), { key: 'Escape' })

    expect(onClose).toHaveBeenCalledOnce()
    expect(view.dom.querySelectorAll('[class*="markora-rich-editor-find-match"]')).toHaveLength(0)
    view.destroy()
  })

  it('stays open when the user clicks outside the find bar', () => {
    const onClose = vi.fn()
    renderFindBar('Alpha', { onClose })

    fireEvent.pointerDown(document.body)

    expect(onClose).not.toHaveBeenCalled()
  })

  it('clears decorations when the rendered find surface unmounts', async () => {
    const { unmount, view } = renderFindBar('Alpha')
    fireEvent.change(screen.getByTestId('rich-editor-find-input'), { target: { value: 'Alpha' } })
    await waitFor(() => expect(view.dom.querySelector('.markora-rich-editor-find-match-active')).toBeTruthy())

    unmount()

    expect(view.dom.querySelectorAll('[class*="markora-rich-editor-find-match"]')).toHaveLength(0)
    view.destroy()
  })
})
