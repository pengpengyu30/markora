import { createExtension } from '@blocknote/core'
import type { Node as ProsemirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type DecorationSet as ProsemirrorDecorationSet } from '@tiptap/pm/view'

const CALLOUT_MARKER_PATTERN = /^\s*\[![^\]\s]+\](?![+-])[ \t]*/u
const LATIN_CHARACTER_PATTERN = /[A-Za-z\u00C0-\u024F]/u
const QUOTE_NODE_TYPE = 'quote'
const RTL_CHARACTER_PATTERN = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u
export const RICH_EDITOR_RTL_DIRECTION_CLASS = 'markora-rich-editor-text-direction-rtl'

type RichEditorDirection = 'auto' | 'rtl'

const textDirectionPluginKey = new PluginKey<ProsemirrorDecorationSet>('tolariaRichEditorTextDirection')

function startsWithRtlStrongCharacter(text: string): boolean {
  for (const character of text) {
    if (RTL_CHARACTER_PATTERN.test(character)) return true
    if (LATIN_CHARACTER_PATTERN.test(character)) return false
  }
  return false
}

export function directionForCalloutMarkerText(text: string): RichEditorDirection {
  const marker = CALLOUT_MARKER_PATTERN.exec(text)
  if (!marker) return startsWithRtlStrongCharacter(text) ? 'rtl' : 'auto'

  return startsWithRtlStrongCharacter(text.slice(marker[0].length)) ? 'rtl' : 'auto'
}

function shouldDecorateQuoteNode(node: ProsemirrorNode): boolean {
  return node.type.name === QUOTE_NODE_TYPE
    && directionForCalloutMarkerText(node.textContent) === 'rtl'
}

function buildTextDirectionDecorations(doc: ProsemirrorNode): ProsemirrorDecorationSet {
  const decorations: Decoration[] = []
  doc.descendants((node, position) => {
    if (!shouldDecorateQuoteNode(node)) return true

    decorations.push(Decoration.node(position, position + node.nodeSize, {
      class: RICH_EDITOR_RTL_DIRECTION_CLASS,
      'data-markora-text-direction': 'rtl',
      style: 'direction: rtl;',
    }))
    return false
  })
  return DecorationSet.create(doc, decorations)
}

function rangeTouchesQuote(doc: ProsemirrorNode, from: number, to: number): boolean {
  const start = Math.max(0, Math.min(from, doc.content.size))
  const end = Math.max(start, Math.min(to, doc.content.size))
  if (start === end) return doc.resolve(start).parent.type.name === QUOTE_NODE_TYPE

  let touched = false
  doc.nodesBetween(start, end, (node) => {
    if (node.type.name !== QUOTE_NODE_TYPE) return true
    touched = true
    return false
  })
  return touched
}

/** Avoid rebuilding RTL quote decorations for edits outside quote blocks. */
export function richEditorTransactionTouchesQuote(transaction: Transaction): boolean {
  if (!transaction.docChanged || !transaction.before) return false

  for (const map of transaction.mapping.maps) {
    let touched = false
    map.forEach((oldStart, oldEnd, newStart, newEnd) => {
      touched = touched
        || rangeTouchesQuote(transaction.before, oldStart, oldEnd)
        || rangeTouchesQuote(transaction.doc, newStart, newEnd)
    })
    if (touched) return true
  }
  return false
}

export const createRichEditorTextDirectionExtension = createExtension(() => ({
  key: 'richEditorTextDirection',
  prosemirrorPlugins: [
    new Plugin<ProsemirrorDecorationSet>({
      key: textDirectionPluginKey,
      props: {
        decorations: (state) => textDirectionPluginKey.getState(state) ?? DecorationSet.empty,
      },
      state: {
        init: (_, state) => buildTextDirectionDecorations(state.doc),
        apply: (transaction, decorations) => (
          richEditorTransactionTouchesQuote(transaction)
            ? buildTextDirectionDecorations(transaction.doc)
            : decorations.map(transaction.mapping, transaction.doc)
        ),
      },
    }),
  ],
}))
