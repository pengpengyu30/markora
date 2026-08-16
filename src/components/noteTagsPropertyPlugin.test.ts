import { Schema } from '@tiptap/pm/model'
import { describe, expect, it } from 'vitest'
import { findNoteTagsPropertyPosition } from './noteTagsPropertyPlugin'

const schema = new Schema({
  nodes: {
    doc: { content: 'blockContainer+' },
    blockContainer: { content: '(heading | paragraph)' },
    heading: { content: 'text*', attrs: { level: { default: 1 } } },
    paragraph: { content: 'text*' },
    text: {},
  },
})

describe('note tags property position', () => {
  it('places the property directly after the H1 block', () => {
    const title = schema.node('blockContainer', null, [
      schema.node('heading', { level: 1 }, [schema.text('Title')]),
    ])
    const body = schema.node('blockContainer', null, [
      schema.node('paragraph', null, [schema.text('Body')]),
    ])
    const doc = schema.node('doc', null, [title, body])

    expect(findNoteTagsPropertyPosition(doc)).toBe(title.nodeSize)
  })

  it('falls back to the first content block when a note has no H1', () => {
    const first = schema.node('blockContainer', null, [
      schema.node('paragraph', null, [schema.text('Body')]),
    ])
    const doc = schema.node('doc', null, [first])

    expect(findNoteTagsPropertyPosition(doc)).toBe(first.nodeSize)
  })
})
