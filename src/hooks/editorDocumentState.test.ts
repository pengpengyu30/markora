import { describe, expect, it } from 'vitest'
import { editorDocumentSignature } from './editorDocumentState'

describe('editorDocumentSignature', () => {
  it('includes inline styles and properties so user formatting is not mistaken for a baseline event', () => {
    const plain = [{
      type: 'paragraph',
      content: [{ type: 'text', text: 'same', styles: {} }],
      children: [],
    }]
    const bold = [{
      type: 'paragraph',
      content: [{ type: 'text', text: 'same', styles: { bold: true } }],
      children: [],
    }]

    expect(editorDocumentSignature(plain)).not.toBe(editorDocumentSignature(bold))
  })
})
