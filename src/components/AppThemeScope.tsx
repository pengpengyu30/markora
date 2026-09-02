import { useLayoutEffect, type ReactNode } from 'react'
import { useEditorTheme } from '../hooks/useTheme'
import { applyEditorThemeApplicationToDocument } from '../editorThemes/editorThemeApplication'

export function AppThemeScope({ children }: { children: ReactNode }) {
  const { theme, editorThemeId } = useEditorTheme()

  // Project the selected editor family onto application semantic roles so the
  // shell follows the editor's visual identity without receiving raw tokens.
  useLayoutEffect(
    () => applyEditorThemeApplicationToDocument(document, theme),
    [theme],
  )

  return (
    <div
      className="app-theme-scope flex h-full min-h-0 w-full flex-col"
      data-app-theme-scope="true"
      data-editor-theme={editorThemeId}
      data-testid="app-theme-scope"
    >
      {children}
    </div>
  )
}
