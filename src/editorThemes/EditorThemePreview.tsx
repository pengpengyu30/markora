import { useCreateBlockNote } from '@blocknote/react'
import '@blocknote/mantine/style.css'
import 'katex/dist/katex.min.css'
import '../components/Editor.css'
import '../components/EditorTheme.css'
import { useEffect, useMemo, useState } from 'react'
import { schema } from '../components/editorSchema'
import { SingleEditorView } from '../components/SingleEditorView'
import { RUNTIME_STYLE_NONCE } from '../lib/runtimeStyleNonce'
import { resolveBlocksForTarget } from '../hooks/editorBlockResolution'
import { buildThemeLaboratoryStyle } from './editorThemeLaboratoryModel'
import type { EffectiveEditorTheme } from './editorThemeCatalog'
import {
  EDITOR_THEME_PREVIEW_FIXTURE_PATH,
  EDITOR_THEME_PREVIEW_MARKDOWN,
} from './editorThemePreviewFixture'
import './EditorThemePreview.css'

export function EditorThemePreview({
  ariaLabel,
  theme,
}: {
  ariaLabel: string
  theme: EffectiveEditorTheme
}) {
  const editor = useCreateBlockNote({
    schema,
    _tiptapOptions: { injectNonce: RUNTIME_STYLE_NONCE },
  })
  const [loadError, setLoadError] = useState<string | null>(null)
  const style = useMemo(
    () => buildThemeLaboratoryStyle(theme, 'theme'),
    [theme],
  )

  useEffect(() => {
    let active = true
    void resolveBlocksForTarget({
      editor,
      cache: new Map(),
      targetPath: EDITOR_THEME_PREVIEW_FIXTURE_PATH,
      content: EDITOR_THEME_PREVIEW_MARKDOWN,
    }).then(({ blocks }) => {
      if (!active) return
      editor.replaceBlocks(editor.document, blocks as typeof editor.document)
    }).catch((error: unknown) => {
      if (!active) return
      setLoadError(error instanceof Error ? error.message : String(error))
    })

    return () => {
      active = false
    }
  }, [editor])

  return (
    <section
      role="region"
      aria-label={ariaLabel}
      className="editor-theme-preview editor-theme-scope"
      data-editor-theme={theme.id}
      data-editor-theme-variant={theme.variant}
      data-editor-theme-scale="100"
      data-testid="settings-editor-theme-preview"
      style={style as React.CSSProperties}
    >
      <div className="editor-theme-preview__surface">
        <SingleEditorView
          editor={editor}
          editable={false}
          editorTheme={theme}
          themeMode={theme.variant}
          entries={[]}
          locale="en"
          onNavigateWikilink={() => {}}
        />
      </div>
      {loadError ? <p className="editor-theme-preview__error" role="alert">{loadError}</p> : null}
    </section>
  )
}
