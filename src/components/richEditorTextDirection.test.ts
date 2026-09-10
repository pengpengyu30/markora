import { Schema } from '@tiptap/pm/model'
import { EditorState } from '@tiptap/pm/state'
import { describe, expect, it } from 'vitest'
import {
  directionForCalloutMarkerText,
  richEditorTransactionTouchesQuote,
} from './richEditorTextDirection'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    text: { group: 'inline' },
    paragraph: { group: 'block', content: 'inline*' },
    quote: { group: 'block', content: 'block+' },
  },
})

describe('directionForCalloutMarkerText', () => {
  it('uses the first strong RTL character after an Obsidian callout marker', () => {
    expect(directionForCalloutMarkerText('[!note] כותרת חשובה')).toBe('rtl')
  })

  it('does not interpret collapsible variants as supported callout markers', () => {
    expect(directionForCalloutMarkerText('[!warning]- مرحبا بالعالم')).toBe('auto')
  })

  it('leaves English callout and quote content on browser auto direction', () => {
    expect(directionForCalloutMarkerText('[!note] Important title')).toBe('auto')
    expect(directionForCalloutMarkerText('A regular quote')).toBe('auto')
  })

  it('detects RTL quote content without a callout marker', () => {
    expect(directionForCalloutMarkerText('ציטוט חשוב')).toBe('rtl')
  })

  it('does not rebuild quote decorations for edits outside quote blocks', () => {
    const state = EditorState.create({
      doc: schema.node('doc', null, [
        schema.node('paragraph', null, schema.text('before')),
        schema.node('quote', null, [schema.node('paragraph', null, schema.text('quote'))]),
      ]),
    })

    expect(richEditorTransactionTouchesQuote(state.tr.insertText('!', 2))).toBe(false)
    expect(richEditorTransactionTouchesQuote(state.tr.insertText('!', 11))).toBe(true)
  })
})
