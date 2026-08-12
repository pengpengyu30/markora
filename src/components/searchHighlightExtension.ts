import type { Node as ProsemirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { createExtension } from '@blocknote/core'
import {
  findSearchHighlightRanges,
  SEARCH_HIGHLIGHT_CLASS,
} from '../utils/searchHighlight'

type SearchHighlightMeta = { query: string } | { query: null }
type SearchHighlightPluginState = DecorationSet

export const searchHighlightPluginKey = new PluginKey<SearchHighlightPluginState>('tolariaSearchHighlight')

function buildSearchHighlightDecorations(doc: ProsemirrorNode, query: string): DecorationSet {
  const decorations: Decoration[] = []
  doc.descendants((node, position) => {
    if (!node.isText || !node.text) return true

    for (const range of findSearchHighlightRanges(node.text, query)) {
      decorations.push(Decoration.inline(
        position + range.from,
        position + range.to,
        { class: SEARCH_HIGHLIGHT_CLASS },
      ))
    }
    return true
  })
  return DecorationSet.create(doc, decorations)
}

export function createSearchHighlightPlugin() {
  return new Plugin<SearchHighlightPluginState>({
    key: searchHighlightPluginKey,
    props: {
      decorations: (state) => searchHighlightPluginKey.getState(state) ?? DecorationSet.empty,
    },
    state: {
      init: () => DecorationSet.empty,
      apply: (transaction, decorations) => {
        const meta = transaction.getMeta(searchHighlightPluginKey) as SearchHighlightMeta | undefined
        if (meta) {
          return meta.query
            ? buildSearchHighlightDecorations(transaction.doc, meta.query)
            : DecorationSet.empty
        }
        return transaction.docChanged
          ? decorations.map(transaction.mapping, transaction.doc)
          : decorations
      },
    },
  })
}

export const createRichEditorSearchHighlightExtension = createExtension(() => ({
  key: 'tolariaRichEditorSearchHighlight',
  prosemirrorPlugins: [createSearchHighlightPlugin()],
}))

export interface SearchHighlightView {
  dom: Element
  state: EditorState & {
    tr: {
      setMeta: (key: PluginKey<SearchHighlightPluginState>, value: SearchHighlightMeta) => unknown
    }
  }
  dispatch: (transaction: unknown) => void
}

export function applyRichEditorSearchHighlight(view: SearchHighlightView, query: string | null): void {
  view.dispatch(view.state.tr.setMeta(searchHighlightPluginKey, { query }))
}

export function richEditorSearchHighlightView(
  editor: { _tiptapEditor?: { view?: SearchHighlightView | null } | null; prosemirrorView?: SearchHighlightView | null },
): SearchHighlightView | null {
  return editor._tiptapEditor?.view ?? editor.prosemirrorView ?? null
}
