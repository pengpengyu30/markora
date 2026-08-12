import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { applySearchHighlight, searchHighlightExtension } from './searchHighlight'

describe('CodeMirror search highlight', () => {
  it('decorates every matching search term without changing the document', () => {
    const host = document.createElement('div')
    const source = 'Tom Jerry\nTom'
    const view = new EditorView({
      state: EditorState.create({
        doc: source,
        extensions: [searchHighlightExtension()],
      }),
      parent: host,
    })

    applySearchHighlight(view, 'tom jerry')

    expect(view.state.doc.toString()).toBe(source)
    expect(Array.from(host.querySelectorAll('.tolaria-search-highlight'), (node) => node.textContent)).toEqual([
      'Tom',
      'Jerry',
      'Tom',
    ])

    applySearchHighlight(view, null)
    expect(host.querySelectorAll('.tolaria-search-highlight')).toHaveLength(0)
    view.destroy()
  })
})
