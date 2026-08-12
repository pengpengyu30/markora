import { useMemo } from 'react'
import type { AppLocale, UiLanguagePreference } from '../lib/i18n'
import type { ThemeMode } from '../lib/themeMode'
import type { NoteWidthMode, SidebarSelection, VaultEntry } from '../types'
import type { ViewMode } from './useViewMode'
import { buildNavigationCommands } from './commands/navigationCommands'
import { buildNoteCommands } from './commands/noteCommands'
import { buildViewCommands } from './commands/viewCommands'
import { buildSettingsCommands } from './commands/settingsCommands'
import { localizeCommandActions } from './commands/localizeCommands'
import type { ImmediateCreateOptions } from './useNoteCreation'
import type { RichEditorBlockTypeDefinition } from '../utils/richEditorBlockTypes'

// Re-export types and helpers for backward compatibility
export type { CommandAction, CommandGroup } from './commands/types'
export { groupSortKey } from './commands/types'
export { buildViewCommands } from './commands/viewCommands'

interface CommandRegistryConfig {
  activeTabPath: string | null
  entries: VaultEntry[]
  onReloadVault?: () => void
  onRepairVault?: () => void
  onRestoreDeletedNote?: () => void
  locale?: AppLocale
  systemLocale?: AppLocale
  selectedUiLanguage?: UiLanguagePreference
  onSetUiLanguage?: (language: UiLanguagePreference) => void
  onSetThemeMode?: (mode: ThemeMode) => void
  onMoveNoteToFolder?: () => void
  canMoveNoteToFolder?: boolean
  onTurnCurrentBlockInto?: (target: RichEditorBlockTypeDefinition) => void
  onRevealActiveFile?: (path: string) => void
  onCopyActiveFilePath?: (path: string) => void
  onOpenActiveFileExternal?: (path: string) => void
  onExportNoteAsPdf?: () => void
  onQuickOpen: () => void
  onCreateNote: (options?: ImmediateCreateOptions) => void
  onSave: () => void
  onPastePlainText: () => void
  onOpenSettings: () => void
  onOpenVault?: () => void
  onCreateEmptyVault?: () => void
  onDeleteNote: (path: string) => void
  onSetViewMode: (mode: ViewMode) => void
  onToggleBacklinks: () => void
  onToggleRawEditor?: () => void
  onFindInNote?: () => void
  onReplaceInNote?: () => void
  noteWidth?: NoteWidthMode
  defaultNoteWidth?: NoteWidthMode
  onSetNoteWidth?: (mode: NoteWidthMode) => void
  onSetDefaultNoteWidth?: (mode: NoteWidthMode) => void
  onToggleTableOfContents?: () => void
  onCheckForUpdates?: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  zoomLevel: number
  onSelect: (sel: SidebarSelection) => void
  onRenameFolder?: () => void
  onDeleteFolder?: () => void
  onRevealSelectedFolder?: () => void
  onCopySelectedFolderPath?: () => void
  onGoBack?: () => void
  onGoForward?: () => void
  canGoBack?: boolean
  canGoForward?: boolean
  onRemoveActiveVault?: () => void
  onRestoreGettingStarted?: () => void
  isGettingStartedHidden?: boolean
  vaultCount?: number
  selection?: SidebarSelection
}

function currentFolderCreateOptions(selection: SidebarSelection | undefined): ImmediateCreateOptions | undefined {
  if (selection?.kind !== 'folder') return undefined
  return {
    creationPath: 'folder_command_palette',
    folderPath: selection.path,
    vaultPath: selection.rootPath,
  }
}

export function useCommandRegistry(config: CommandRegistryConfig): import('./commands/types').CommandAction[] {
  const {
    activeTabPath, entries,
    onQuickOpen, onCreateNote, onSave,
    onPastePlainText, onOpenSettings,
    onDeleteNote,
    onSetViewMode, onToggleBacklinks, onToggleRawEditor, onFindInNote, onReplaceInNote,
    noteWidth, defaultNoteWidth, onSetNoteWidth, onSetDefaultNoteWidth, onToggleTableOfContents, onOpenVault, onCreateEmptyVault,
    onZoomIn, onZoomOut, onZoomReset, zoomLevel,
    onSelect, onRenameFolder, onDeleteFolder, onRevealSelectedFolder, onCopySelectedFolderPath,
    onGoBack, onGoForward, canGoBack, canGoForward,
    onCheckForUpdates,
    onRemoveActiveVault, onRestoreGettingStarted, isGettingStartedHidden, vaultCount,
    onReloadVault, onRepairVault, onRestoreDeletedNote,
    locale, systemLocale, selectedUiLanguage, onSetUiLanguage, onSetThemeMode,
    onMoveNoteToFolder, canMoveNoteToFolder, onTurnCurrentBlockInto,
    onRevealActiveFile, onCopyActiveFilePath, onOpenActiveFileExternal, onExportNoteAsPdf,
    
    selection,
  } = config

  const hasActiveNote = activeTabPath !== null

  const activeEntry = useMemo(
    () => (hasActiveNote ? entries.find(e => e.path === activeTabPath) : undefined),
    [entries, activeTabPath, hasActiveNote],
  )
  const folderCreateOptions = useMemo(() => currentFolderCreateOptions(selection), [selection])
  const navigationCommands = useMemo(() => buildNavigationCommands({
    onQuickOpen,
    onSelect,
    selection,
    onRenameFolder,
    onDeleteFolder,
    onRevealSelectedFolder,
    onCopySelectedFolderPath,
    onGoBack,
    onGoForward,
    canGoBack,
    canGoForward,
  }), [
    onQuickOpen, onSelect, selection, onRenameFolder, onDeleteFolder,
    onRevealSelectedFolder, onCopySelectedFolderPath,
    onGoBack, onGoForward, canGoBack, canGoForward,
  ])

  const noteCommands = useMemo(() => buildNoteCommands({
    hasActiveNote, activeTabPath, activeFileKind: activeEntry?.fileKind ?? 'markdown', locale,
    currentFolderCreateOptions: folderCreateOptions, onCreateNote, onSave,
    onFindInNote, onReplaceInNote, onPastePlainText,
    onDeleteNote,
    onMoveNoteToFolder, canMoveNoteToFolder,
    onTurnCurrentBlockInto,
    onRevealActiveFile, onCopyActiveFilePath, onOpenActiveFileExternal,
    onExportNoteAsPdf,
  }), [
    hasActiveNote, activeTabPath, activeEntry?.fileKind, locale,
    folderCreateOptions, onCreateNote, onSave,
    onFindInNote, onReplaceInNote, onPastePlainText, onDeleteNote,
    onMoveNoteToFolder, canMoveNoteToFolder, onTurnCurrentBlockInto,
    onRevealActiveFile, onCopyActiveFilePath, onOpenActiveFileExternal,
    onExportNoteAsPdf,
  ])

  const viewCommands = useMemo(() => buildViewCommands({
    hasActiveNote, onSetViewMode, onToggleBacklinks,
    onToggleRawEditor, noteWidth, defaultNoteWidth, onSetNoteWidth, onSetDefaultNoteWidth, onToggleTableOfContents, zoomLevel, onZoomIn, onZoomOut, onZoomReset,
  }), [
    hasActiveNote, onSetViewMode, onToggleBacklinks,
    onToggleRawEditor, noteWidth, defaultNoteWidth, onSetNoteWidth, onSetDefaultNoteWidth, onToggleTableOfContents,
    zoomLevel, onZoomIn, onZoomOut, onZoomReset,
  ])

  const settingsCommands = useMemo(() => buildSettingsCommands({
    vaultCount, isGettingStartedHidden,
    onOpenSettings, onOpenVault, onCreateEmptyVault, onRemoveActiveVault, onRestoreGettingStarted,
    onCheckForUpdates, onReloadVault, onRepairVault, onRestoreDeletedNote,
    locale, systemLocale, selectedUiLanguage, onSetUiLanguage, onSetThemeMode,
  }), [
    vaultCount, isGettingStartedHidden, onOpenSettings,
    onOpenVault, onCreateEmptyVault, onRemoveActiveVault, onRestoreGettingStarted,
    onCheckForUpdates, onReloadVault, onRepairVault, onRestoreDeletedNote,
    locale, systemLocale, selectedUiLanguage, onSetUiLanguage, onSetThemeMode,
  ])

  const commands = useMemo(() => [
    ...navigationCommands,
    ...noteCommands,
    ...viewCommands,
    ...settingsCommands,
  ], [
    navigationCommands, noteCommands, viewCommands,
    settingsCommands,
  ])

  return useMemo(() => localizeCommandActions(commands, locale), [commands, locale])
}
