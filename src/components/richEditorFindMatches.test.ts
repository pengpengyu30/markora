import { Schema } from '@tiptap/pm/model'
import { describe, expect, it } from 'vitest'
import {
  extractRichEditorVisibleText,
  findRichEditorMatches,
  findRichEditorMatchesInVisibleText,
} from './richEditorFindMatches'

const schema = new Schema({
  nodes: {
    doc: { content: 'frontmatter? paragraph+' },
    frontmatter: { group: 'block', content: 'text*' },
    paragraph: { content: 'inline*', group: 'block', toDOM: () => ['p', 0] },
    text: { group: 'inline' },
  },
  marks: {
    strong: {},
    link: { attrs: { href: {} } },
  },
})

describe('rich editor find matches', () => {
  it('maps a match across a bold text run back to its ProseMirror range', () => {
    const strong = schema.marks.strong.create()
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [
        schema.text('Read '),
        schema.text('Tom', [strong]),
        schema.text(' Jerry', [strong]),
      ]),
    ])

    const result = findRichEditorMatches(doc, 'tom jerry', { caseSensitive: false, regex: false })

    expect(result.visibleText).toBe('Read Tom Jerry')
    expect(result.matches).toEqual([
      expect.objectContaining({
        text: 'Tom Jerry',
        from: 6,
        to: 15,
      }),
    ])
  })

  it('excludes frontmatter, link URLs, and Markdown-only delimiters from visible text', () => {
    const link = schema.marks.link.create({ href: 'https://example.test/hidden-url' })
    const doc = schema.node('doc', null, [
      schema.node('frontmatter', null, schema.text('hidden-frontmatter')),
      schema.node('paragraph', null, [
        schema.text('Visible '),
        schema.text('label', [link]),
      ]),
    ])

    expect(extractRichEditorVisibleText(doc).text).toBe('Visible label')
    expect(findRichEditorMatches(doc, 'hidden-frontmatter', { caseSensitive: false, regex: false }).matches).toEqual([])
    expect(findRichEditorMatches(doc, 'hidden-url', { caseSensitive: false, regex: false }).matches).toEqual([])
    expect(findRichEditorMatches(doc, '**', { caseSensitive: false, regex: false }).matches).toEqual([])
  })

  it('reuses a precomputed visible-text mapping for repeated queries', () => {
    const doc = schema.node('doc', null, [schema.node('paragraph', null, schema.text('Alpha beta Alpha'))])
    const visible = extractRichEditorVisibleText(doc)

    expect(findRichEditorMatchesInVisibleText(visible, 'Alpha', { caseSensitive: false, regex: false })).toEqual(
      expect.objectContaining({
        visibleText: 'Alpha beta Alpha',
        matches: [
          expect.objectContaining({ from: 1, to: 6 }),
          expect.objectContaining({ from: 12, to: 17 }),
        ],
      }),
    )
  })
})
