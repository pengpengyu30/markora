import { describe, expect, it, vi } from 'vitest'
import { BlockNoteEditor } from '@blocknote/core'
import { schema } from '../components/editorSchema'
import {
  installRichEditorMarkdownSerializer,
  preProcessRichEditorMarkdown,
  restoreBlankBlockquoteParagraphs,
  serializeRichEditorBodyToMarkdown,
  serializeRichEditorDocumentToMarkdown,
  type RichEditorMarkdownSerializer,
} from './richEditorMarkdown'

describe('rich-editor Markdown serialization', () => {
  it('installs direct serialization through the shared rich-editor API', () => {
    const blocksToMarkdownLossy = vi.fn(() => 'legacy markdown\n')
    const editor: RichEditorMarkdownSerializer = {
      document: [{
        type: 'paragraph',
        content: [{ type: 'text', text: 'Keep [[Project Alpha]] fast.', styles: {} }],
        children: [],
      }],
      blocksToMarkdownLossy,
    }

    installRichEditorMarkdownSerializer(editor)

    expect(serializeRichEditorBodyToMarkdown(editor)).toBe('Keep [[Project Alpha]] fast.\n')
    expect(blocksToMarkdownLossy).not.toHaveBeenCalled()
  })

  it('protects blank paragraphs inside blockquotes before rich parsing', () => {
    const processed = preProcessRichEditorMarkdown('> First paragraph.\n>\n> Second paragraph.')

    expect(processed).toContain('> \u200B')
  })

  it('restores serialized blank blockquote gaps without splitting the quote rail', () => {
    expect(restoreBlankBlockquoteParagraphs('> First\n\n> \n\n> Second')).toBe(
      '> First\n>\n> Second',
    )
  })

  it('preserves a long source document when one nested list item changes', async () => {
    const sections = Array.from({ length: 32 }, (_, index) => [
      `### Section ${index + 1}`,
      '',
      `1. Parent ${index + 1}`,
      '',
      `   1. Child ${index + 1}`,
      `   2. Target ${index + 1}`,
      '',
      '      ~~~markdown',
      `      # Nested ${index + 1}`,
      '      ~~~',
      '',
      `2. Next ${index + 1}`,
      '',
    ].join('\n'))
    const source = sections.join('\n')
    const editor = BlockNoteEditor.create({ schema })
    installRichEditorMarkdownSerializer(editor)
    const blocks = await editor.tryParseMarkdownToBlocks(preProcessRichEditorMarkdown(source))
    editor.replaceBlocks(editor.document, blocks)

    const findTarget = (items: typeof editor.document): typeof editor.document[number] | null => {
      for (const block of items) {
        const text = Array.isArray(block.content)
          ? block.content.map(item => 'text' in item ? item.text : '').join('')
          : ''
        if (text === 'Target 1') return block
        const nested = findTarget(block.children)
        if (nested) return nested
      }
      return null
    }
    const target = findTarget(editor.document)
    if (!target) throw new Error('long source target not found')

    editor.updateBlock(target, { content: 'Target 1 edited' })

    expect(serializeRichEditorDocumentToMarkdown({ editor, tabContent: source })).toBe(
      source.replace('   2. Target 1', '   2. Target 1 edited'),
    )
  })

  it('keeps newly inserted nested list items when switching to source mode', async () => {
    const sections = Array.from({ length: 32 }, (_, index) => [
      `### Section ${index + 1}`,
      '',
      `1. Parent ${index + 1}`,
      '',
      `   1. Child ${index + 1}`,
      `   2. Target ${index + 1}`,
      '',
      '      ~~~markdown',
      `      # Nested ${index + 1}`,
      '      ~~~',
      '',
      `2. Next ${index + 1}`,
      '',
    ].join('\n'))
    const source = sections.join('\n')
    const editor = BlockNoteEditor.create({ schema })
    installRichEditorMarkdownSerializer(editor)
    const blocks = await editor.tryParseMarkdownToBlocks(preProcessRichEditorMarkdown(source))
    editor.replaceBlocks(editor.document, blocks)

    const findBlockByText = (items: typeof editor.document, text: string): typeof editor.document[number] | null => {
      for (const block of items) {
        const blockText = Array.isArray(block.content)
          ? block.content.map(item => 'text' in item ? item.text : '').join('')
          : ''
        if (blockText === text) return block
        const nested = findBlockByText(block.children, text)
        if (nested) return nested
      }
      return null
    }
    const target = findBlockByText(editor.document, 'Child 1')
    if (!target) throw new Error('nested list insertion target not found')

    editor.insertBlocks([
      { type: 'numberedListItem', content: 'TEST ONLY' },
      { type: 'numberedListItem', content: 'EDIT TEST in LIST' },
    ], target.id, 'before')

    const serialized = serializeRichEditorDocumentToMarkdown({ editor, tabContent: source })

    expect(serialized).toBe(source.replace(
      '   1. Child 1',
      '   1. TEST ONLY\n   2. EDIT TEST in LIST\n   1. Child 1',
    ))
  })
})
