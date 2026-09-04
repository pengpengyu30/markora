import { describe, expect, it, vi } from 'vitest'
import { refreshRichEditorCodeBlockHighlighting } from './richEditorCodeHighlighting'

describe('rich editor code highlighting adapter', () => {
  it('clears cached decorations and dispatches a presentation-only refresh', () => {
    const cache = new Map([['cached', []]])
    const transaction = {
      setMeta: vi.fn(() => transaction),
    }
    const view = {
      state: {
        config: { pluginsByKey: { 'prosemirror-highlight$': {} } },
        tr: transaction,
        'prosemirror-highlight$': { cache: { cache } },
      },
      dispatch: vi.fn(),
    }

    expect(refreshRichEditorCodeBlockHighlighting({ prosemirrorView: view })).toBe(true)
    expect(cache).toHaveLength(0)
    expect(transaction.setMeta).toHaveBeenCalledWith('prosemirror-highlight-refresh', true)
    expect(view.dispatch).toHaveBeenCalledWith(transaction)
  })

  it('reports no refresh when the editor view is unavailable', () => {
    expect(refreshRichEditorCodeBlockHighlighting({})).toBe(false)
  })
})
