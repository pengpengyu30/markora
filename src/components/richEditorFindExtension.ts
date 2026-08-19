import { createExtension } from '@blocknote/core'
import type { Node as ProsemirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'

export const RICH_EDITOR_FIND_MATCH_CLASS = 'markora-rich-editor-find-match'
export const RICH_EDITOR_FIND_ACTIVE_MATCH_CLASS = 'markora-rich-editor-find-match-active'

export interface RichEditorFindDecorationMatch {
  from: number
  to: number
}

export interface RichEditorFindState {
  activeIndex: number
  matches: readonly RichEditorFindDecorationMatch[]
}

interface RichEditorFindPluginState extends RichEditorFindState {
  decorations: DecorationSet
}

type RichEditorFindMeta = RichEditorFindState | null

export const richEditorFindPluginKey = new PluginKey<RichEditorFindPluginState>('tolariaRichEditorFind')

function clampActiveIndex(index: number, matchCount: number): number {
  if (matchCount <= 0) return 0
  return Math.min(Math.max(index, 0), matchCount - 1)
}

function validMatches(doc: ProsemirrorNode, matches: readonly RichEditorFindDecorationMatch[]): RichEditorFindDecorationMatch[] {
  return matches.filter((match) => (
    match.from >= 0
    && match.to > match.from
    && match.to <= doc.content.size
  ))
}

function buildDecorations(
  doc: ProsemirrorNode,
  matches: readonly RichEditorFindDecorationMatch[],
  activeIndex: number,
): DecorationSet {
  const decorations = validMatches(doc, matches).map((match, index) => (
    Decoration.inline(match.from, match.to, {
      class: index === activeIndex
        ? RICH_EDITOR_FIND_ACTIVE_MATCH_CLASS
        : RICH_EDITOR_FIND_MATCH_CLASS,
    })
  ))
  return DecorationSet.create(doc, decorations)
}

function buildPluginState(doc: ProsemirrorNode, state: RichEditorFindState): RichEditorFindPluginState {
  const matches = validMatches(doc, state.matches)
  const activeIndex = clampActiveIndex(state.activeIndex, matches.length)
  return {
    activeIndex,
    decorations: buildDecorations(doc, matches, activeIndex),
    matches,
  }
}

function mapMatches(transaction: Transaction, state: RichEditorFindPluginState): RichEditorFindPluginState {
  const matches = state.matches
    .map((match) => ({
      from: transaction.mapping.map(match.from, 1),
      to: transaction.mapping.map(match.to, -1),
    }))
    .filter((match) => match.to > match.from)
  return buildPluginState(transaction.doc, {
    activeIndex: state.activeIndex,
    matches,
  })
}

export function createRichEditorFindPlugin() {
  return new Plugin<RichEditorFindPluginState>({
    key: richEditorFindPluginKey,
    props: {
      decorations: (state) => richEditorFindPluginKey.getState(state)?.decorations ?? DecorationSet.empty,
    },
    state: {
      init: (_, state) => buildPluginState(state.doc, { activeIndex: 0, matches: [] }),
      apply: (transaction, pluginState) => {
        const meta = transaction.getMeta(richEditorFindPluginKey) as RichEditorFindMeta | undefined
        if (meta !== undefined) {
          return meta ? buildPluginState(transaction.doc, meta) : buildPluginState(transaction.doc, { activeIndex: 0, matches: [] })
        }
        return transaction.docChanged ? mapMatches(transaction, pluginState) : pluginState
      },
    },
  })
}

export const createRichEditorFindExtension = createExtension(() => ({
  key: 'tolariaRichEditorFind',
  prosemirrorPlugins: [createRichEditorFindPlugin()],
}))

export interface RichEditorFindView {
  dom: Element
  state: EditorState & {
    tr: Transaction
  }
  dispatch: (transaction: Transaction) => void
}

export interface RichEditorFindEditor {
  _tiptapEditor?: { view?: RichEditorFindView | null } | null
  prosemirrorView?: RichEditorFindView | null
}

export function applyRichEditorFindState(
  view: RichEditorFindView | EditorView,
  state: RichEditorFindState,
): void {
  let transaction = view.state.tr
    .setMeta(richEditorFindPluginKey, state)
    .setMeta('addToHistory', false)
  const activeMatch = state.matches[clampActiveIndex(state.activeIndex, state.matches.length)]
  if (activeMatch) {
    transaction = transaction
      .setSelection(TextSelection.create(transaction.doc, activeMatch.from, activeMatch.to))
      .scrollIntoView()
  }
  view.dispatch(transaction)
}

export function clearRichEditorFind(view: RichEditorFindView | EditorView): void {
  if ('isDestroyed' in view && view.isDestroyed) return
  view.dispatch(view.state.tr.setMeta(richEditorFindPluginKey, null).setMeta('addToHistory', false))
}

export function richEditorFindView(
  editor: RichEditorFindEditor,
): RichEditorFindView | null {
  const candidate = editor._tiptapEditor?.view ?? editor.prosemirrorView ?? null
  if (!candidate || typeof candidate !== 'object' || typeof candidate.dispatch !== 'function') return null
  if (!candidate.state || typeof candidate.state !== 'object' || !candidate.state.doc) return null
  return candidate
}
