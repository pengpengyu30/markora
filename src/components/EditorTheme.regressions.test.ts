import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const editorThemeCss = readFileSync('src/components/EditorTheme.css', 'utf8')

describe('EditorTheme regression guards', () => {
  it('keeps a one-pixel inset for selected table-cell overlays', () => {
    expect(editorThemeCss).toMatch(/\.selectedCell::after\s*\{[^}]*inset:\s*1px/s)
  })

  it('keeps adjacent blockquotes on one continuous visual rail', () => {
    expect(editorThemeCss).toContain('[data-content-type="quote"]')
    expect(editorThemeCss).toMatch(/\.bn-block-outer:has\([^)]*data-content-type="quote"[^)]*\)/)
  })

  it('uses scalable CSS bullet markers instead of a fixed glyph', () => {
    expect(editorThemeCss).toContain('--lists-marker-radius')
    expect(editorThemeCss).toContain('radial-gradient(')
  })
})
