import { describe, expect, it, vi } from 'vitest'
import {
  installRichEditorMarkdownSerializer,
  preProcessRichEditorMarkdown,
  restoreBlankBlockquoteParagraphs,
  serializeRichEditorBodyToMarkdown,
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
})
