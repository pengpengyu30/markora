import { BlockNoteEditor } from '@blocknote/core'
import { describe, expect, it } from 'vitest'
import {
  injectMarkdownHighlightsInBlocks,
  serializeMarkdownHighlightAwareBlocks,
} from '../utils/markdownHighlightMarkdown'
import { schema } from './editorSchema'
import {
  applyMarkdownHighlightColor,
  toggleDefaultMarkdownHighlight,
} from './markdownHighlightModel'
import { readMarkdownHighlightRange } from './markdownHighlightRange'

async function editorFromMarkdown(markdown: string) {
  const editor = BlockNoteEditor.create({ schema })
  const blocks = injectMarkdownHighlightsInBlocks(
    await editor.tryParseMarkdownToBlocks(markdown),
  ) as Parameters<typeof editor.replaceBlocks>[1]
  editor.replaceBlocks(editor.document, blocks)
  return editor
}

function selectText(editor: Awaited<ReturnType<typeof editorFromMarkdown>>, from: number, to = from) {
  editor._tiptapEditor.commands.setTextSelection({ from, to })
}

function textRange(editor: Awaited<ReturnType<typeof editorFromMarkdown>>, text: string) {
  let range: { from: number; to: number } | null = null
  editor.prosemirrorState.doc.descendants((node, position) => {
    if (range || !node.isText) return
    const index = node.text?.indexOf(text) ?? -1
    if (index !== -1) range = { from: position + index, to: position + index + text.length }
  })
  if (!range) throw new Error(`Text not found in editor: ${text}`)
  return range
}

describe('Markdown highlight editing model', () => {
  it('finds and recolors a complete colored highlight at a collapsed cursor', async () => {
    const editor = await editorFromMarkdown('==🔴red words==')
    const expectedRange = textRange(editor, 'red words')
    selectText(editor, expectedRange.from + 1)

    const range = readMarkdownHighlightRange(editor)
    expect(range).toEqual({ color: 'red', ...expectedRange })

    applyMarkdownHighlightColor(editor, 'blue', range)

    expect(serializeMarkdownHighlightAwareBlocks(editor, editor.document)).toBe('==🔵red words==')
  })

  it('uses yellow for the default action and removes both highlight marks when toggled off', async () => {
    const editor = await editorFromMarkdown('plain')
    const range = textRange(editor, 'plain')
    selectText(editor, range.from, range.to)

    toggleDefaultMarkdownHighlight(editor)
    expect(serializeMarkdownHighlightAwareBlocks(editor, editor.document)).toBe('==plain==')

    selectText(editor, range.from, range.to)
    toggleDefaultMarkdownHighlight(editor)
    expect(serializeMarkdownHighlightAwareBlocks(editor, editor.document)).toBe('plain')
  })

  it('removes a custom color prefix when the active highlight is toggled off', async () => {
    const editor = await editorFromMarkdown('==🔴red==')
    const range = textRange(editor, 'red')
    selectText(editor, range.from, range.to)

    toggleDefaultMarkdownHighlight(editor)

    expect(serializeMarkdownHighlightAwareBlocks(editor, editor.document)).toBe('red')
  })
})
