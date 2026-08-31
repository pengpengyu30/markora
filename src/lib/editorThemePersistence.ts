import type { Settings } from '../types'
import {
  applyEditorThemeIdToDocument,
  captureEditorThemeStorage,
  restoreEditorThemeStorage,
  writeStoredEditorThemeId,
  type EditorThemeDocument,
  type EditorThemeStorage,
} from './editorThemeStorage'
import {
  normalizeEditorThemeId,
  type EditorThemeId,
} from '../editorThemes/editorThemeCatalog'

export interface EditorThemeChangeResult {
  ok: boolean
  editorThemeId: EditorThemeId
  error: unknown | null
}

interface EditorThemePersistenceCoordinatorOptions {
  document: EditorThemeDocument
  getSettings: () => Settings
  saveSettings: (settings: Settings) => Promise<unknown> | unknown
  storage: EditorThemeStorage
}

export interface EditorThemePersistenceCoordinator {
  setEditorTheme: (value: unknown, settingsOverride?: Settings) => Promise<EditorThemeChangeResult>
}

function currentDocumentEditorThemeId(documentObject: EditorThemeDocument): EditorThemeId | null {
  const value = documentObject.documentElement.getAttribute('data-editor-theme')
  return value === null ? null : normalizeEditorThemeId(value)
}

export function createEditorThemePersistenceCoordinator({
  document: documentObject,
  getSettings,
  saveSettings,
  storage,
}: EditorThemePersistenceCoordinatorOptions): EditorThemePersistenceCoordinator {
  return {
    async setEditorTheme(value: unknown, settingsOverride?: Settings): Promise<EditorThemeChangeResult> {
      const currentSettings = getSettings()
      const previousEditorThemeId = currentDocumentEditorThemeId(documentObject)
        ?? normalizeEditorThemeId(currentSettings.editor_theme)
      const storageSnapshot = captureEditorThemeStorage(storage)
      const editorThemeId = normalizeEditorThemeId(value)

      applyEditorThemeIdToDocument(documentObject, editorThemeId)

      try {
        const result = await saveSettings({
          ...(settingsOverride ?? currentSettings),
          editor_theme: editorThemeId,
        })
        if (result === false) {
          throw new Error('Failed to persist editor theme')
        }

        writeStoredEditorThemeId(storage, editorThemeId)
        return { ok: true, editorThemeId, error: null }
      } catch (error) {
        applyEditorThemeIdToDocument(documentObject, previousEditorThemeId)
        restoreEditorThemeStorage(storage, storageSnapshot)
        return { ok: false, editorThemeId: previousEditorThemeId, error }
      }
    },
  }
}
