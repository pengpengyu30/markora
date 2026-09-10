import type { Node as ProsemirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'

const CODE_BLOCK_TYPE = 'codeBlock'
const LINE_NUMBER_CLASS = 'editor__code-line-number'
const lineNumberPluginKey = new PluginKey<DecorationSet>('tolariaCodeBlockLineNumbers')

function lineStartOffsets(source: string): number[] {
  const offsets = [0]
  for (let offset = 0; offset < source.length; offset += 1) {
    if (source.charCodeAt(offset) === 10) offsets.push(offset + 1)
  }
  return offsets
}

function createLineNumberMarker(view: EditorView, lineNumber: number): HTMLElement {
  const marker = view.dom.ownerDocument.createElement('span')
  marker.className = LINE_NUMBER_CLASS
  marker.dataset.codeLineNumber = String(lineNumber)
  marker.setAttribute('aria-hidden', 'true')
  marker.setAttribute('contenteditable', 'false')
  return marker
}

function lineNumberWidget(position: number, lineNumber: number): Decoration {
  return Decoration.widget(position, (view) => createLineNumberMarker(view, lineNumber), {
    ignoreSelection: true,
    key: `code-line-${position}-${lineNumber}`,
    side: -1,
  })
}

type CodeBlockLocation = {
  node: ProsemirrorNode
  position: number
}

function codeBlockLocations(doc: ProsemirrorNode): CodeBlockLocation[] {
  const locations: CodeBlockLocation[] = []
  doc.descendants((node, position) => {
    if (node.type.name !== CODE_BLOCK_TYPE) return true
    locations.push({ node, position })
    return false
  })
  return locations
}

export function codeBlockNodesChanged(before: ProsemirrorNode, after: ProsemirrorNode): boolean {
  const previous = codeBlockLocations(before)
  const next = codeBlockLocations(after)
  if (previous.length !== next.length) return true
  return next.some((location, index) => !location.node.eq(previous[index]?.node ?? location.node))
}

function rangeTouchesCodeBlock(doc: ProsemirrorNode, from: number, to: number): boolean {
  const start = Math.max(0, Math.min(from, doc.content.size))
  const end = Math.max(start, Math.min(to, doc.content.size))
  if (start === end) return doc.resolve(start).parent.type.name === CODE_BLOCK_TYPE

  let touched = false
  doc.nodesBetween(start, end, (node) => {
    if (node.type.name !== CODE_BLOCK_TYPE) return true
    touched = true
    return false
  })
  return touched
}

/**
 * Detects code-block edits from the transaction's changed ranges. A normal
 * paragraph edit only maps existing line-number decorations and avoids walking
 * every block in a large document.
 */
export function codeBlockTransactionTouchesCodeBlock(transaction: Transaction): boolean {
  if (!transaction.docChanged || !transaction.before) return false

  for (const map of transaction.mapping.maps) {
    let touched = false
    map.forEach((oldStart, oldEnd, newStart, newEnd) => {
      touched = touched
        || rangeTouchesCodeBlock(transaction.before, oldStart, oldEnd)
        || rangeTouchesCodeBlock(transaction.doc, newStart, newEnd)
    })
    if (touched) return true
  }
  return false
}

function lineNumberDecorationsForBlock(location: CodeBlockLocation): Decoration[] {
  return lineStartOffsets(location.node.textContent).map((offset, index) => (
    lineNumberWidget(location.position + 1 + offset, index + 1)
  ))
}

function buildLineNumberDecorations(doc: ProsemirrorNode): DecorationSet {
  const decorations: Decoration[] = []
  codeBlockLocations(doc).forEach((location) => {
    decorations.push(...lineNumberDecorationsForBlock(location))
  })
  return DecorationSet.create(doc, decorations)
}

function updateChangedCodeBlockDecorations(
  decorations: DecorationSet,
  before: ProsemirrorNode,
  after: ProsemirrorNode,
  mapping: Parameters<DecorationSet['map']>[0],
): DecorationSet {
  const previous = codeBlockLocations(before)
  const next = codeBlockLocations(after)
  if (previous.length !== next.length) return buildLineNumberDecorations(after)

  let mapped = decorations.map(mapping, after)
  next.forEach((location, index) => {
    if (location.node.eq(previous[index]?.node ?? location.node)) return
    const from = location.position + 1
    const to = location.position + location.node.nodeSize
    mapped = mapped
      .remove(mapped.find(from, to))
      .add(after, lineNumberDecorationsForBlock(location))
  })
  return mapped
}

export function createCodeBlockLineNumberPlugin(): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key: lineNumberPluginKey,
    props: {
      decorations: (state) => lineNumberPluginKey.getState(state) ?? DecorationSet.empty,
    },
    state: {
      init: (_, state) => buildLineNumberDecorations(state.doc),
      apply: (transaction, decorations) => (
        transaction.docChanged
          ? codeBlockTransactionTouchesCodeBlock(transaction)
            ? updateChangedCodeBlockDecorations(
              decorations,
              transaction.before,
              transaction.doc,
              transaction.mapping,
            )
            : decorations.map(transaction.mapping, transaction.doc)
          : decorations.map(transaction.mapping, transaction.doc)
      ),
    },
  })
}
