import type { Node as ProsemirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const noteTagsPropertyPluginKey = new PluginKey<DecorationSet>('tolariaNoteTagsProperty')

function containsTitleHeading(node: ProsemirrorNode): boolean {
  let found = false
  node.descendants((child) => {
    if (child.type.name !== 'heading') return !found
    const level = Number(child.attrs.level ?? 1)
    found = level === 1
    return !found
  })
  return found
}

export function findNoteTagsPropertyPosition(doc: ProsemirrorNode): number {
  let firstBlockEnd: number | null = null
  let titleBlockEnd: number | null = null

  doc.descendants((node, position) => {
    if (node.type.name !== 'blockContainer') return titleBlockEnd === null
    const blockEnd = position + node.nodeSize
    firstBlockEnd ??= blockEnd
    if (containsTitleHeading(node)) titleBlockEnd = blockEnd
    return false
  })

  return titleBlockEnd ?? firstBlockEnd ?? 0
}

function buildDecorations(doc: ProsemirrorNode, host: HTMLElement): DecorationSet {
  const widget = Decoration.widget(findNoteTagsPropertyPosition(doc), host, {
    ignoreSelection: true,
    key: 'tolaria-note-tags-property',
    side: 1,
  })
  return DecorationSet.create(doc, [widget])
}

export function createNoteTagsPropertyPlugin(host: HTMLElement): Plugin<DecorationSet> {
  return new Plugin<DecorationSet>({
    key: noteTagsPropertyPluginKey,
    props: {
      decorations: (state) => noteTagsPropertyPluginKey.getState(state) ?? DecorationSet.empty,
    },
    state: {
      init: (_, state) => buildDecorations(state.doc, host),
      apply: (transaction, decorations) => (
        transaction.docChanged
          ? buildDecorations(transaction.doc, host)
          : decorations.map(transaction.mapping, transaction.doc)
      ),
    },
  })
}
