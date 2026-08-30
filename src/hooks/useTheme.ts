import { useMemo } from 'react'
import { useDocumentEditorThemeId } from './useDocumentEditorThemeId'
import { useDocumentThemeMode } from './useDocumentThemeMode'
import {
  flattenEditorTheme,
  resolveEffectiveEditorTheme,
} from '../editorThemes/editorThemeCatalog'

export function useEditorTheme() {
  const themeMode = useDocumentThemeMode()
  const editorThemeId = useDocumentEditorThemeId()
  const effectiveTheme = useMemo(
    () => resolveEffectiveEditorTheme(editorThemeId, themeMode),
    [editorThemeId, themeMode],
  )
  const { cssVars, styleString } = useMemo(() => {
    const vars = flattenEditorTheme(effectiveTheme)
    const str = Object.entries(vars)
      .map(([k, v]) => `${k}: ${v};`)
      .join('\n')
    return { cssVars: vars, styleString: str }
  }, [effectiveTheme])

  const themeConfig = useMemo(() => ({
    ...effectiveTheme.shared,
    colors: effectiveTheme.tokens.colors,
  }), [effectiveTheme])

  return { themeConfig, theme: effectiveTheme, editorThemeId: effectiveTheme.id, cssVars, styleString }
}
