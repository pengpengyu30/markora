import {
  Decoration,
  type DecorationSet,
  EditorView,
} from '@codemirror/view'
import {
  StateEffect,
  StateField,
  type Extension,
} from '@codemirror/state'
import {
  findSearchHighlightRanges,
  SEARCH_HIGHLIGHT_CLASS,
} from '../utils/searchHighlight'

type SearchHighlightEffect = {
  query: string | null
}

const setSearchHighlightEffect = StateEffect.define<SearchHighlightEffect>()

function buildQueryDecorations(
  doc: { length: number; sliceString: (from: number, to: number) => string },
  query: string,
): DecorationSet {
  return Decoration.set(
    findSearchHighlightRanges(doc.sliceString(0, doc.length), query)
      .map((range) => Decoration.mark({ class: SEARCH_HIGHLIGHT_CLASS }).range(range.from, range.to)),
  )
}

const searchHighlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    let next = decorations.map(transaction.changes)
    for (const effect of transaction.effects) {
      if (!effect.is(setSearchHighlightEffect)) continue
      next = effect.value.query
        ? buildQueryDecorations(transaction.state.doc, effect.value.query)
        : Decoration.none
    }
    return next
  },
  provide: (field) => EditorView.decorations.from(field),
})

export function searchHighlightExtension(): Extension {
  return searchHighlightField
}

export function applySearchHighlight(view: EditorView, query: string | null): void {
  view.dispatch({ effects: setSearchHighlightEffect.of({ query }) })
  if (query) {
    const firstRange = findSearchHighlightRanges(view.state.doc.toString(), query)[0]
    if (firstRange) view.dispatch({ effects: EditorView.scrollIntoView(firstRange.from, { y: 'center' }) })
  }
}
