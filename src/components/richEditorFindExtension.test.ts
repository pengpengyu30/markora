import { Schema } from '@tiptap/pm/model'
import { EditorState } from '@tiptap/pm/state'
import { EditorView } from '@tiptap/pm/view'
import { describe, expect, it, vi } from 'vitest'
import {
  applyRichEditorFindState,
  clearRichEditorFind,
  createRichEditorFindPlugin,
} from './richEditorFindExtension'

const schema = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: { content: 'text*', toDOM: () => ['p', 0] },
    text: { group: 'inline' },
  },
})

describe('Rich editor find decorations', () => {
  it('centers the active match in the editor scroll area', () => {
    const host = document.createElement('div')
    const doc = schema.node('doc', null, [schema.node('paragraph', null, schema.text('one two three'))])
    const view = new EditorView(host, {
      state: EditorState.create({
        doc,
        plugins: [createRichEditorFindPlugin()],
      }),
    })
    const scrollIntoView = vi.fn()
    const previousDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })

    try {
      applyRichEditorFindState(view, {
        activeIndex: 1,
        matches: [
          { from: 1, to: 4 },
          { from: 5, to: 8 },
          { from: 9, to: 14 },
        ],
      })

      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'auto',
        block: 'center',
        inline: 'nearest',
      })
    } finally {
      if (previousDescriptor) {
        Object.defineProperty(Element.prototype, 'scrollIntoView', previousDescriptor)
      } else {
        delete (Element.prototype as Partial<Element>).scrollIntoView
      }
      view.destroy()
    }
  })

  it('renders one active decoration and inactive decorations for the remaining matches', () => {
    const host = document.createElement('div')
    const doc = schema.node('doc', null, [schema.node('paragraph', null, schema.text('one two three'))])
    const view = new EditorView(host, {
      state: EditorState.create({
        doc,
        plugins: [createRichEditorFindPlugin()],
      }),
    })

    applyRichEditorFindState(view, {
      activeIndex: 1,
      matches: [
        { from: 1, to: 4 },
        { from: 5, to: 8 },
        { from: 9, to: 14 },
      ],
    })

    expect(host.querySelectorAll('.markora-rich-editor-find-match')).toHaveLength(2)
    expect(host.querySelectorAll('.markora-rich-editor-find-match-active')).toHaveLength(1)
    expect(host.querySelector('.markora-rich-editor-find-match-active')).toHaveTextContent('two')

    clearRichEditorFind(view)
    expect(host.querySelectorAll('[class*="markora-rich-editor-find-match"]')).toHaveLength(0)
    view.destroy()
  })
})
