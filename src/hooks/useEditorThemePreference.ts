import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Settings } from '../types'
import {
  applyEditorThemeIdToDocument,
  writeStoredEditorThemeId,
  type EditorThemeDocument,
  type EditorThemeStorage,
} from '../lib/editorThemeStorage'
import {
  normalizeEditorThemeId,
} from '../editorThemes/editorThemeCatalog'
import {
  createEditorThemePersistenceCoordinator,
  type EditorThemeChangeResult,
  type EditorThemePersistenceCoordinator,
} from '../lib/editorThemePersistence'
import { useDocumentEditorThemeId } from './useDocumentEditorThemeId'

export interface EditorThemePreferenceOptions {
  document?: EditorThemeDocument
  saveSettings: (settings: Settings) => Promise<unknown> | unknown
  settings: Settings
  settingsLoaded: boolean
  storage?: EditorThemeStorage
}

const NOOP_STORAGE: EditorThemeStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

const NOOP_DOCUMENT: EditorThemeDocument = {
  documentElement: {
    getAttribute: () => null,
    setAttribute: () => {},
  } as unknown as HTMLElement,
}

function resolveStorage(storage?: EditorThemeStorage): EditorThemeStorage {
  if (storage) return storage
  if (typeof window === 'undefined') return NOOP_STORAGE
  try {
    return window.localStorage
  } catch {
    return NOOP_STORAGE
  }
}

function resolveDocument(documentObject?: EditorThemeDocument): EditorThemeDocument {
  if (documentObject) return documentObject
  return typeof document === 'undefined' ? NOOP_DOCUMENT : document
}

export function useEditorThemePreference({
  document: documentObject,
  saveSettings,
  settings,
  settingsLoaded,
  storage,
}: EditorThemePreferenceOptions) {
  const resolvedStorage = useMemo(() => resolveStorage(storage), [storage])
  const resolvedDocument = useMemo(() => resolveDocument(documentObject), [documentObject])
  const coordinator = useMemo<EditorThemePersistenceCoordinator>(() => (
    createEditorThemePersistenceCoordinator({
      document: resolvedDocument,
      getSettings: () => settings,
      saveSettings,
      storage: resolvedStorage,
    })
  ), [resolvedDocument, resolvedStorage, saveSettings, settings])
  const editorThemeId = useDocumentEditorThemeId()
  const [editorThemeError, setEditorThemeError] = useState<unknown | null>(null)

  useEffect(() => {
    if (!settingsLoaded) return

    const loadedEditorThemeId = applyEditorThemeIdToDocument(
      resolvedDocument,
      settings.editor_theme,
    )
    writeStoredEditorThemeId(resolvedStorage, loadedEditorThemeId)
  }, [resolvedDocument, resolvedStorage, settings.editor_theme, settingsLoaded])

  const setEditorTheme = useCallback(async (value: unknown): Promise<EditorThemeChangeResult> => {
    if (!settingsLoaded) {
      return {
        ok: false,
        editorThemeId,
        error: new Error('Editor theme settings are still loading'),
      }
    }

    const result = await coordinator.setEditorTheme(normalizeEditorThemeId(value))
    setEditorThemeError(result.error)
    return result
  }, [coordinator, editorThemeId, settingsLoaded])

  return {
    editorThemeError,
    editorThemeId,
    setEditorTheme,
  }
}
