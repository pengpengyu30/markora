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

  it('routes rich content surfaces and embedded controls through editor theme tokens', () => {
    expect(editorThemeCss).toMatch(
      /\.editor-theme-scope \.editor__blocknote-container \.bn-container\s*\{[^}]*background:\s*var\(--editor-theme-surfaces-canvas\)[^}]*color:\s*var\(--editor-theme-text-primary\)/s,
    )
    expect(editorThemeCss).toContain('var(--editor-theme-feedback-warning-background)')
    expect(editorThemeCss).toContain('var(--editor-theme-feedback-info-background)')
    expect(editorThemeCss).toContain('var(--editor-theme-embedded-controls-background)')
    expect(editorThemeCss).toContain('var(--editor-theme-embedded-controls-text)')
  })

  it('shows rich code line numbers only for the Code family', () => {
    expect(editorThemeCss).toMatch(
      /\.editor-theme-scope\[data-editor-theme="code"\][^{]*\.editor__code-line-numbers*\s*\{[^}]*display:\s*inline-block/s,
    )
    expect(editorThemeCss).toMatch(
      /\.editor-theme-scope:not\(\[data-editor-theme="code"\]\)[^{]*\.editor__code-line-numbers*\s*\{[^}]*display:\s*none/s,
    )
  })

  it('keeps callout and semantic highlight colors inside the editor theme contract', () => {
    expect(editorThemeCss).toContain('var(--editor-theme-accents-highlights-red)')
    expect(editorThemeCss).toContain('var(--editor-theme-accents-highlights-green)')
    expect(editorThemeCss).toContain('var(--editor-theme-accents-highlights-blue)')
    expect(editorThemeCss).toContain('var(--editor-theme-accents-highlights-purple)')
    expect(editorThemeCss).toContain('var(--editor-theme-feedback-example-text)')
    expect(editorThemeCss).toContain('var(--editor-theme-feedback-quote-text)')
  })

  it('themes KaTeX presentation without changing its Markdown source boundary', () => {
    expect(editorThemeCss).toContain('.editor-theme-scope .katex')
    expect(editorThemeCss).toContain('color: var(--editor-theme-text-primary)')
    expect(editorThemeCss).toContain('font-size: 1em')
  })
})
