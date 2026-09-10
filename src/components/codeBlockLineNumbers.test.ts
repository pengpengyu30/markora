import { Schema } from '@tiptap/pm/model'
import { EditorState } from '@tiptap/pm/state'
import { EditorView } from '@tiptap/pm/view'
import { describe, expect, it } from 'vitest'
import {
  codeBlockTransactionTouchesCodeBlock,
  codeBlockNodesChanged,
  createCodeBlockLineNumberPlugin,
} from './codeBlockLineNumbers'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    text: { group: 'inline' },
    paragraph: {
      group: 'block',
      content: 'inline*',
      toDOM: () => ['p', 0],
    },
    codeBlock: {
      group: 'block',
      code: true,
      content: 'text*',
      toDOM: () => ['pre', ['code', 0]],
    },
  },
})

function renderCodeBlock(source: string) {
  const host = document.createElement('div')
  const content = source ? schema.text(source) : undefined
  const doc = schema.node('doc', null, [schema.node('codeBlock', null, content)])
  const state = EditorState.create({
    doc,
    plugins: [createCodeBlockLineNumberPlugin()],
  })
  const view = new EditorView(host, { state })
  return { host, view }
}

describe('code block line numbers', () => {
  it('renders an in-flow marker at every logical line start without changing source text', () => {
    const source = 'one\ntwo\n\nthree\n'
    const { host, view } = renderCodeBlock(source)

    const markers = host.querySelectorAll<HTMLElement>('[data-code-line-number]')
    expect(Array.from(markers, (marker) => marker.dataset.codeLineNumber)).toEqual([
      '1', '2', '3', '4', '5',
    ])
    expect(Array.from(markers, (marker) => marker.getAttribute('contenteditable')))
      .toEqual(['false', 'false', 'false', 'false', 'false'])
    expect(host.querySelector('code')?.textContent).toBe(source)

    view.destroy()
  })

  it('updates markers through editor transactions instead of observing rendered geometry', () => {
    const { host, view } = renderCodeBlock('one')
    const codeBlockStart = 1

    view.dispatch(view.state.tr.insertText('\ntwo\nthree', codeBlockStart + 3))

    expect(Array.from(
      host.querySelectorAll<HTMLElement>('[data-code-line-number]'),
      (marker) => marker.dataset.codeLineNumber,
    )).toEqual(['1', '2', '3'])
    expect(host.querySelector('code')?.textContent).toBe('one\ntwo\nthree')

    view.destroy()
  })

  it('recognizes paragraph-only changes without invalidating code-block markers', () => {
    const codeBlock = (source: string) => schema.node('codeBlock', null, source ? schema.text(source) : undefined)
    const before = schema.node('doc', null, [
      schema.node('paragraph', null, schema.text('before')),
      codeBlock('one\ntwo'),
    ])
    const paragraphChanged = schema.node('doc', null, [
      schema.node('paragraph', null, schema.text('before changed')),
      codeBlock('one\ntwo'),
    ])
    const codeChanged = schema.node('doc', null, [
      schema.node('paragraph', null, schema.text('before')),
      codeBlock('one\ntwo\nthree'),
    ])

    expect(codeBlockNodesChanged(before, paragraphChanged)).toBe(false)
    expect(codeBlockNodesChanged(before, codeChanged)).toBe(true)
  })

  it('checks only changed transaction ranges for ordinary paragraph edits', () => {
    const codeBlock = schema.node('codeBlock', null, schema.text('one\ntwo'))
    const state = EditorState.create({
      doc: schema.node('doc', null, [
        schema.node('paragraph', null, schema.text('before')),
        codeBlock,
      ]),
    })
    const paragraphEdit = state.tr.insertText(' changed', 7)
    const codeEdit = state.tr.insertText(' three', 15)

    expect(codeBlockTransactionTouchesCodeBlock(paragraphEdit)).toBe(false)
    expect(codeBlockTransactionTouchesCodeBlock(codeEdit)).toBe(true)
  })
})
