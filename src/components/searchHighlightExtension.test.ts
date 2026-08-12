import { Schema } from '@tiptap/pm/model'
import { EditorState } from '@tiptap/pm/state'
import { EditorView } from '@tiptap/pm/view'
import { describe, expect, it } from 'vitest'
import {
  applyRichEditorSearchHighlight,
  createSearchHighlightPlugin,
} from './searchHighlightExtension'

const schema = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: { content: 'text*', toDOM: () => ['p', 0] },
    text: { group: 'inline' },
  },
})

describe('Rich editor search highlight', () => {
  it('decorates matching text without changing the ProseMirror document', () => {
    const host = document.createElement('div')
    const source = 'Tom Jerry\nTom'
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, schema.text(source)),
    ])
    const view = new EditorView(host, {
      state: EditorState.create({
        doc,
        plugins: [createSearchHighlightPlugin()],
      }),
    })

    applyRichEditorSearchHighlight(view, 'tom jerry')

    expect(view.state.doc.textContent).toBe(source)
    expect(Array.from(host.querySelectorAll('.tolaria-search-highlight'), (node) => node.textContent)).toEqual([
      'Tom',
      'Jerry',
      'Tom',
    ])

    applyRichEditorSearchHighlight(view, null)
    expect(host.querySelectorAll('.tolaria-search-highlight')).toHaveLength(0)
    view.destroy()
  })
})
