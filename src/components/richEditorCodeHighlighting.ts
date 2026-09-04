const PROSEMIRROR_HIGHLIGHT_PLUGIN_KEY_PREFIX = 'prosemirror-highlight$'
const PROSEMIRROR_HIGHLIGHT_REFRESH_META = 'prosemirror-highlight-refresh'

type CodeBlockHighlightRefreshTransaction = {
  setMeta: (key: string, value: boolean) => CodeBlockHighlightRefreshTransaction
}

type CodeBlockHighlightRefreshView = {
  dispatch: (transaction: CodeBlockHighlightRefreshTransaction) => void
  state: {
    config?: {
      pluginsByKey?: Record<string, unknown>
    }
    tr: CodeBlockHighlightRefreshTransaction
  }
}

type EditorWithCodeBlockHighlightRefreshView = {
  _tiptapEditor?: {
    view?: CodeBlockHighlightRefreshView | null
  } | null
  prosemirrorView?: CodeBlockHighlightRefreshView | null
}

function readCodeBlockHighlightRefreshView(editor: unknown): CodeBlockHighlightRefreshView | null {
  if (typeof editor !== 'object' || editor === null) return null
  const editorWithView = editor as EditorWithCodeBlockHighlightRefreshView
  return editorWithView._tiptapEditor?.view ?? editorWithView.prosemirrorView ?? null
}

function clearCodeBlockHighlightCache(view: CodeBlockHighlightRefreshView): void {
  const pluginKey = Object.keys(view.state.config?.pluginsByKey ?? {}).find((key) => (
    key.startsWith(PROSEMIRROR_HIGHLIGHT_PLUGIN_KEY_PREFIX)
  ))
  if (!pluginKey) return

  const pluginState = (view.state as unknown as Record<string, unknown>)[pluginKey]
  if (typeof pluginState !== 'object' || pluginState === null) return

  const decorationCache = (pluginState as { cache?: unknown }).cache
  if (typeof decorationCache !== 'object' || decorationCache === null) return

  const cacheMap = (decorationCache as { cache?: unknown }).cache
  if (cacheMap instanceof Map) cacheMap.clear()
}

/** Refresh only Shiki decorations; the document and editor instance stay intact. */
export function refreshRichEditorCodeBlockHighlighting(editor: unknown): boolean {
  const view = readCodeBlockHighlightRefreshView(editor)
  if (!view) return false

  clearCodeBlockHighlightCache(view)
  const transaction = view.state.tr.setMeta(PROSEMIRROR_HIGHLIGHT_REFRESH_META, true)
  view.dispatch(transaction)
  return true
}
