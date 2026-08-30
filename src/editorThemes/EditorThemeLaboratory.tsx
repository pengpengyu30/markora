import { useEffect, useMemo, useState } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import '@blocknote/mantine/style.css'
import 'katex/dist/katex.min.css'
import '../components/Editor.css'
import '../components/EditorTheme.css'
import { AppPreferencesProvider } from '../hooks/useAppPreferences'
import { resolveBlocksForTarget } from '../hooks/editorBlockResolution'
import { RUNTIME_STYLE_NONCE } from '../lib/runtimeStyleNonce'
import {
  EDITOR_THEME_CATALOG,
  EDITOR_THEME_IDS,
  resolveEffectiveEditorTheme,
  type EditorThemeId,
  type EditorThemeVariant,
} from './editorThemeCatalog'
import { buildThemeLaboratoryStyle, type ThemeLaboratoryWidthMode } from './editorThemeLaboratoryModel'
import {
  EDITOR_THEME_LABORATORY_FIXTURE_PATH,
  EDITOR_THEME_LABORATORY_MARKDOWN,
} from './editorThemeLaboratoryFixture'
import { schema } from '../components/editorSchema'
import { SingleEditorView } from '../components/SingleEditorView'
import type { VaultEntry } from '../types'
import './EditorThemeLaboratory.css'

const LABORATORY_ENTRY: VaultEntry = {
  path: '/theme-laboratory/editor-themes-phase-3.md',
  filename: 'editor-themes-phase-3.md',
  title: 'Editor Themes Phase 3',
  isA: 'Note',
  aliases: [],
  belongsTo: [],
  relatedTo: [],
  status: 'Active',
  archived: false,
  modifiedAt: 0,
  createdAt: 0,
  fileSize: EDITOR_THEME_LABORATORY_MARKDOWN.length,
  snippet: '',
  wordCount: 0,
  relationships: {},
  icon: null,
  color: null,
  order: null,
  sidebarLabel: null,
  template: null,
  sort: null,
  view: null,
  visible: true,
  organized: true,
  favorite: false,
  favoriteIndex: null,
  listPropertiesDisplay: [],
  outgoingLinks: ['Alpha Project'],
  properties: {},
  hasH1: true,
  fileKind: 'markdown',
}

function LaboratoryPreview({
  themeId,
  variant,
  widthMode,
}: {
  themeId: EditorThemeId
  variant: EditorThemeVariant
  widthMode: ThemeLaboratoryWidthMode
}) {
  const editor = useCreateBlockNote({
    schema,
    _tiptapOptions: { injectNonce: RUNTIME_STYLE_NONCE },
  })
  const [loadError, setLoadError] = useState<string | null>(null)
  const theme = useMemo(
    () => resolveEffectiveEditorTheme(themeId, variant),
    [themeId, variant],
  )
  const style = useMemo(
    () => buildThemeLaboratoryStyle(theme, widthMode),
    [theme, widthMode],
  )

  useEffect(() => {
    let active = true
    void resolveBlocksForTarget({
      editor,
      cache: new Map(),
      targetPath: EDITOR_THEME_LABORATORY_FIXTURE_PATH,
      content: EDITOR_THEME_LABORATORY_MARKDOWN,
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
      className={`editor-theme-laboratory__preview${widthMode === 'wide' ? ' editor-content-width--wide' : ''}`}
      data-editor-theme-preview={themeId}
      data-editor-theme-variant={variant}
      data-editor-theme-width={widthMode}
      style={style}
    >
      <header className="editor-theme-laboratory__preview-header">
        <h2>{theme.displayName}</h2>
        <span>{variant === 'light' ? 'Light' : 'Dark'} / {widthMode === 'theme' ? 'Theme default' : widthMode}</span>
      </header>
      {loadError ? (
        <p className="editor-theme-laboratory__error" role="alert">{loadError}</p>
      ) : (
        <div className="editor-theme-laboratory__surface">
          <SingleEditorView
            editor={editor}
            editable={false}
            entries={[LABORATORY_ENTRY]}
            locale="en"
            onNavigateWikilink={() => {}}
          />
        </div>
      )}
    </section>
  )
}

function useLaboratoryAppearance(variant: EditorThemeVariant) {
  useEffect(() => {
    const root = document.documentElement
    const previousTheme = root.getAttribute('data-theme')
    const hadDarkClass = root.classList.contains('dark')

    root.setAttribute('data-theme', variant)
    root.classList.toggle('dark', variant === 'dark')

    return () => {
      if (previousTheme === null) root.removeAttribute('data-theme')
      else root.setAttribute('data-theme', previousTheme)
      root.classList.toggle('dark', hadDarkClass)
    }
  }, [variant])
}

export function EditorThemeLaboratory() {
  const [variant, setVariant] = useState<EditorThemeVariant>('light')
  const [widthMode, setWidthMode] = useState<ThemeLaboratoryWidthMode>('theme')
  useLaboratoryAppearance(variant)

  return (
    <AppPreferencesProvider appLocale="en">
      <main className="editor-theme-laboratory" data-testid="editor-theme-laboratory">
        <header className="editor-theme-laboratory__toolbar">
          <div>
            <p className="editor-theme-laboratory__eyebrow">Internal development surface</p>
            <h1>Editor Theme Laboratory</h1>
            <p className="editor-theme-laboratory__summary">
              Read-only Rich renderer review for the complete editor-theme token set.
            </p>
          </div>
          <div className="editor-theme-laboratory__controls" aria-label="Laboratory controls">
            <label>
              Appearance
              <select value={variant} onChange={(event) => setVariant(event.target.value as EditorThemeVariant)}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label>
              Width
              <select value={widthMode} onChange={(event) => setWidthMode(event.target.value as ThemeLaboratoryWidthMode)}>
                <option value="theme">Theme default</option>
                <option value="normal">Normal</option>
                <option value="wide">Wide</option>
              </select>
            </label>
          </div>
        </header>
        <div className="editor-theme-laboratory__grid">
          {EDITOR_THEME_CATALOG.filter(theme => EDITOR_THEME_IDS.includes(theme.id)).map(theme => (
            <LaboratoryPreview
              key={theme.id}
              themeId={theme.id}
              variant={variant}
              widthMode={widthMode}
            />
          ))}
        </div>
      </main>
    </AppPreferencesProvider>
  )
}
