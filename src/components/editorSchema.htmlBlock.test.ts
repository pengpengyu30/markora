import { describe, expect, it } from 'vitest'
import { schema } from './editorSchema'

describe('editor schema legacy block compatibility', () => {
  it('removes the executable HTML node while retaining the tldraw node', () => {
    expect(schema.blockSchema).not.toHaveProperty('htmlBlock')
    expect(schema.blockSchema).toHaveProperty('tldrawBlock')
  })
})
