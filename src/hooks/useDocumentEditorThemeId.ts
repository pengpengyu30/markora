import { useSyncExternalStore } from 'react'
import {
  DEFAULT_EDITOR_THEME_ID,
  normalizeEditorThemeId,
  type EditorThemeId,
} from '../editorThemes/editorThemeCatalog'

function readDocumentEditorThemeId(): EditorThemeId {
  if (typeof document === 'undefined') return DEFAULT_EDITOR_THEME_ID
  return normalizeEditorThemeId(document.documentElement.getAttribute('data-editor-theme'))
}

function subscribeDocumentEditorThemeId(onChange: () => void): () => void {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
    return () => {}
  }

  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributeFilter: ['data-editor-theme'],
    attributes: true,
  })

  return () => observer.disconnect()
}

export function useDocumentEditorThemeId(): EditorThemeId {
  return useSyncExternalStore(
    subscribeDocumentEditorThemeId,
    readDocumentEditorThemeId,
    () => DEFAULT_EDITOR_THEME_ID,
  )
}
