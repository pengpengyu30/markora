import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useEditorTheme } from './useTheme'

describe('useEditorTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-editor-theme')
  })

  it('keeps inline code on the muted editor surface without exporting code block overrides', () => {
    const { result } = renderHook(() => useEditorTheme())

    expect(result.current.cssVars['--inline-styles-code-background-color']).toBe(
      'var(--editor-theme-surfaces-inline-code)'
    )
    expect(result.current.cssVars['--code-blocks-background-color']).toBeUndefined()
  })

  it('keeps h4 visually between body text and h3 while remaining bold', () => {
    const { result } = renderHook(() => useEditorTheme())

    const bodySize = Number.parseFloat(result.current.cssVars['--editor-font-size'])
    const h3Size = Number.parseFloat(result.current.cssVars['--headings-h3-font-size'])
    const h4Size = Number.parseFloat(result.current.cssVars['--headings-h4-font-size'])

    expect(h4Size).toBeGreaterThan(bodySize)
    expect(h4Size).toBeLessThan(h3Size)
    expect(result.current.cssVars['--headings-h4-font-weight']).toBe('600')
  })

  it('exports the default editor max width', () => {
    const { result } = renderHook(() => useEditorTheme())

    expect(result.current.cssVars['--editor-max-width']).toBe('820px')
  })

  it('resolves only the validated editor family from the document identity', () => {
    document.documentElement.setAttribute('data-editor-theme', 'code')
    const codeTheme = renderHook(() => useEditorTheme())
    expect(codeTheme.result.current.editorThemeId).toBe('code')
    codeTheme.unmount()

    document.documentElement.setAttribute('data-editor-theme', 'removed-theme')
    const fallbackTheme = renderHook(() => useEditorTheme())
    expect(fallbackTheme.result.current.editorThemeId).toBe('default')
  })
})
