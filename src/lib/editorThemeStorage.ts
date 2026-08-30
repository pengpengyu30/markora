import { APP_STORAGE_KEYS } from '../constants/appStorage'
import {
  normalizeEditorThemeId,
  type EditorThemeId,
} from '../editorThemes/editorThemeCatalog'

export const EDITOR_THEME_STORAGE_KEY = APP_STORAGE_KEYS.editorTheme

export type EditorThemeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export type EditorThemeDocument = Pick<Document, 'documentElement'>

export interface EditorThemeStorageSnapshot {
  rawValue: string | null
  editorThemeId: EditorThemeId
}

function readRawEditorThemeValue(storage: EditorThemeStorage): string | null {
  try {
    return storage.getItem(EDITOR_THEME_STORAGE_KEY)
  } catch {
    return null
  }
}

export function captureEditorThemeStorage(storage: EditorThemeStorage): EditorThemeStorageSnapshot {
  const rawValue = readRawEditorThemeValue(storage)
  return {
    rawValue,
    editorThemeId: normalizeEditorThemeId(rawValue),
  }
}

export function readStoredEditorThemeId(storage: EditorThemeStorage): EditorThemeId {
  return captureEditorThemeStorage(storage).editorThemeId
}

export function writeStoredEditorThemeId(
  storage: EditorThemeStorage,
  editorThemeId: EditorThemeId,
): void {
  try {
    storage.setItem(EDITOR_THEME_STORAGE_KEY, normalizeEditorThemeId(editorThemeId))
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function restoreEditorThemeStorage(
  storage: EditorThemeStorage,
  snapshot: EditorThemeStorageSnapshot,
): void {
  try {
    if (snapshot.rawValue === null) {
      storage.removeItem(EDITOR_THEME_STORAGE_KEY)
      return
    }
    storage.setItem(EDITOR_THEME_STORAGE_KEY, snapshot.rawValue)
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

export function applyEditorThemeIdToDocument(
  documentObject: EditorThemeDocument,
  value: unknown,
): EditorThemeId {
  const editorThemeId = normalizeEditorThemeId(value)
  documentObject.documentElement.setAttribute('data-editor-theme', editorThemeId)
  return editorThemeId
}

export function applyStoredEditorTheme(
  documentObject: EditorThemeDocument,
  storage: EditorThemeStorage,
): EditorThemeId {
  return applyEditorThemeIdToDocument(documentObject, readStoredEditorThemeId(storage))
}
