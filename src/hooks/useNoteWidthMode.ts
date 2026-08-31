import { useCallback, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { isTauri, mockInvoke } from '../mock-tauri'
import type { NoteWidthMode, NoteWidthPreference, Settings, VaultEntry } from '../types'
import type { FrontmatterValue } from '../types'
import type { FrontmatterOpOptions } from './frontmatterOps'
import {
  canPersistNoteWidthMode,
  normalizeNoteWidthMode,
  resolveNoteWidth,
  toggleNoteWidthMode,
  type NoteWidthSource,
} from '../utils/noteWidth'

type VaultPath = VaultEntry['path']
type MarkdownContent = string
type ToastMessage = string | null

interface EditorTab {
  entry: VaultEntry
  content: MarkdownContent
}

interface ReadWidthContentRequest {
  path: VaultPath
  fallbackContent: MarkdownContent
}

interface ActiveTabRequest {
  tabs: EditorTab[]
  activeTabPath: VaultPath | null
}

interface CurrentWidthRequest {
  activeTab: EditorTab | null
  defaultNoteWidth: NoteWidthPreference
  themeRecommendedWidth: number | null | undefined
  transientNoteWidths: Record<VaultPath, NoteWidthMode>
}

interface UseNoteWidthModeOptions {
  tabs: EditorTab[]
  activeTabPath: VaultPath | null
  settings: Settings
  saveSettings: (settings: Settings) => Promise<unknown>
  updateFrontmatter: (
    path: VaultPath,
    key: string,
    value: FrontmatterValue,
    options?: FrontmatterOpOptions,
  ) => Promise<void>
  deleteFrontmatter: (
    path: VaultPath,
    key: string,
    options?: FrontmatterOpOptions,
  ) => Promise<void>
  themeRecommendedWidth?: number | null
  setToastMessage: (message: ToastMessage) => void
}

interface PersistWidthRequest {
  activeTab: EditorTab | null
  mode: NoteWidthPreference
  updateFrontmatter: UseNoteWidthModeOptions['updateFrontmatter']
  deleteFrontmatter: UseNoteWidthModeOptions['deleteFrontmatter']
  rememberTransientWidth: (path: VaultPath, mode: NoteWidthMode) => void
  clearTransientWidth: (path: VaultPath) => void
  setToastMessage: (message: ToastMessage) => void
}

function resolveActiveTab({ tabs, activeTabPath }: ActiveTabRequest): EditorTab | null {
  return tabs.find((tab) => tab.entry.path === activeTabPath) ?? null
}

function resolveCurrentWidth({
  activeTab,
  defaultNoteWidth,
  themeRecommendedWidth,
  transientNoteWidths,
}: CurrentWidthRequest) {
  const noteWidth = activeTab
    ? (Reflect.get(transientNoteWidths, activeTab.entry.path) as NoteWidthMode | undefined) ?? activeTab.entry.noteWidth
    : null
  return resolveNoteWidth(noteWidth, defaultNoteWidth, themeRecommendedWidth)
}

async function readNoteContentForWidthPersistence({
  path,
  fallbackContent,
}: ReadWidthContentRequest): Promise<MarkdownContent> {
  try {
    return isTauri()
      ? await invoke<MarkdownContent>('get_note_content', { path })
      : await mockInvoke<MarkdownContent>('get_note_content', { path })
  } catch (error) {
    void error
    return fallbackContent
  }
}

async function persistOrRememberNoteWidth({
  activeTab,
  mode,
  updateFrontmatter,
  deleteFrontmatter,
  rememberTransientWidth,
  clearTransientWidth,
  setToastMessage,
}: PersistWidthRequest): Promise<void> {
  const path = activeTab?.entry.path
  if (!path) return

  const persistedContent = await readNoteContentForWidthPersistence({
    path,
    fallbackContent: activeTab.content,
  })
  if (!canPersistNoteWidthMode(persistedContent)) {
    if (mode === null) clearTransientWidth(path)
    else rememberTransientWidth(path, mode)
    return
  }

  try {
    if (mode === null) {
      await deleteFrontmatter(path, '_width', { silent: true })
      clearTransientWidth(path)
    } else {
      await updateFrontmatter(path, '_width', mode, { silent: true })
      rememberTransientWidth(path, mode)
    }
  } catch (err) {
    setToastMessage(`Failed to ${mode === null ? 'reset' : 'update'} note width: ${err}`)
  }
}

export function useNoteWidthMode({
  tabs,
  activeTabPath,
  settings,
  saveSettings,
  updateFrontmatter,
  deleteFrontmatter,
  themeRecommendedWidth = null,
  setToastMessage,
}: UseNoteWidthModeOptions) {
  const [transientNoteWidths, setTransientNoteWidths] = useState<Record<VaultPath, NoteWidthMode>>({})
  const activeTab = useMemo(
    () => resolveActiveTab({ tabs, activeTabPath }),
    [activeTabPath, tabs],
  )
  const defaultNoteWidth = useMemo(
    () => normalizeNoteWidthMode(settings.note_width_mode),
    [settings.note_width_mode],
  )
  const resolvedNoteWidth = useMemo(
    () => resolveCurrentWidth({
      activeTab,
      defaultNoteWidth,
      themeRecommendedWidth,
      transientNoteWidths,
    }),
    [activeTab, defaultNoteWidth, themeRecommendedWidth, transientNoteWidths],
  )
  const noteWidth = resolvedNoteWidth.mode

  const rememberTransientWidth = useCallback((path: VaultPath, mode: NoteWidthMode) => {
    setTransientNoteWidths((previous) => {
      if (Reflect.get(previous, path) === mode) return previous
      const next = { ...previous }
      Reflect.set(next, path, mode)
      return next
    })
  }, [])

  const clearTransientWidth = useCallback((path: VaultPath) => {
    setTransientNoteWidths((previous) => {
      if (!Object.hasOwn(previous, path)) return previous
      const next = { ...previous }
      Reflect.deleteProperty(next, path)
      return next
    })
  }, [])

  const setNoteWidth = useCallback((mode: NoteWidthPreference) => persistOrRememberNoteWidth({
    activeTab,
    mode,
    updateFrontmatter,
    deleteFrontmatter,
    rememberTransientWidth,
    clearTransientWidth,
    setToastMessage,
  }), [activeTab, clearTransientWidth, deleteFrontmatter, rememberTransientWidth, setToastMessage, updateFrontmatter])

  const toggleNoteWidth = useCallback(() => {
    void setNoteWidth(toggleNoteWidthMode(noteWidth))
  }, [noteWidth, setNoteWidth])

  const setDefaultNoteWidth = useCallback(async (mode: NoteWidthPreference) => {
    await saveSettings({ ...settings, note_width_mode: mode })
  }, [saveSettings, settings])

  return {
    activeTab,
    defaultNoteWidth,
    noteWidth,
    noteWidthMaxWidth: resolvedNoteWidth.maxWidth,
    noteWidthSource: resolvedNoteWidth.source as NoteWidthSource,
    setDefaultNoteWidth,
    setNoteWidth,
    toggleNoteWidth,
  }
}
