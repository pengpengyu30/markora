import { useMemo } from 'react'
import type { AppLocale, UiLanguagePreference } from '../lib/i18n'
import type { ThemeMode } from '../lib/themeMode'
import type { NoteWidthMode, SidebarSelection, VaultEntry } from '../types'
import type { ViewMode } from './useViewMode'
import { buildNavigationCommands } from './commands/navigationCommands'
import { buildNoteCommands } from './commands/noteCommands'
import { buildGitCommands } from './commands/gitCommands'
import { buildViewCommands } from './commands/viewCommands'
import { buildSettingsCommands } from './commands/settingsCommands'
import { localizeCommandActions } from './commands/localizeCommands'
import type { GitRepositoryOption } from '../utils/gitRepositories'
import type { ImmediateCreateOptions } from './useNoteCreation'
import type { RichEditorBlockTypeDefinition } from '../utils/richEditorBlockTypes'

// Re-export types and helpers for backward compatibility
export type { CommandAction, CommandGroup } from './commands/types'
export { groupSortKey } from './commands/types'
export { buildViewCommands } from './commands/viewCommands'

interface CommandRegistryConfig {
  activeTabPath: string | null
  entries: VaultEntry[]
  modifiedCount: number
  onReloadVault?: () => void
  onRepairVault?: () => void
  locale?: AppLocale
  systemLocale?: AppLocale
  selectedUiLanguage?: UiLanguagePreference
  onSetUiLanguage?: (language: UiLanguagePreference) => void
  onSetThemeMode?: (mode: ThemeMode) => void
  onMoveNoteToFolder?: () => void
  canMoveNoteToFolder?: boolean
  onTurnCurrentBlockInto?: (target: RichEditorBlockTypeDefinition) => void
  onOpenInNewWindow?: () => void
  onRevealActiveFile?: (path: string) => void
  onCopyActiveFilePath?: (path: string) => void
  onCopyActiveDeepLink?: (path: string) => void
  onOpenActiveFileExternal?: (path: string) => void
  onExportNoteAsPdf?: () => void
  onRestoreDeletedNote?: () => void
  canRestoreDeletedNote?: boolean
  onQuickOpen: () => void
  onCreateNote: (options?: ImmediateCreateOptions) => void
  onSave: () => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  undoLabel?: string | null
  redoLabel?: string | null
  onPastePlainText: () => void
  onOpenSettings: () => void
  onOpenFeedback?: () => void
  onOpenVault?: () => void
  onCreateEmptyVault?: () => void
  onAddRemote?: () => void
  canAddRemote?: boolean
  gitFeaturesEnabled?: boolean
  isGitVault?: boolean
  gitRepositories?: GitRepositoryOption[]
  onInitializeGit?: () => void
  onDeleteNote: (path: string) => void
  onCommitPush: () => void
  onPull?: () => void
  onPullRepository?: (path: string) => void
  onResolveConflicts?: () => void
  onSetViewMode: (mode: ViewMode) => void
  onToggleBacklinks: () => void
  onToggleDiff?: () => void
  onToggleRawEditor?: () => void
  onFindInNote?: () => void
  onReplaceInNote?: () => void
  noteWidth?: NoteWidthMode
  defaultNoteWidth?: NoteWidthMode
  onSetNoteWidth?: (mode: NoteWidthMode) => void
  onSetDefaultNoteWidth?: (mode: NoteWidthMode) => void
  onToggleTableOfContents?: () => void
  activeNoteModified: boolean
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
    activeTabPath, entries, modifiedCount,
    onQuickOpen, onCreateNote, onSave, onUndo, onRedo, canUndo, canRedo, undoLabel, redoLabel,
    onPastePlainText, onOpenSettings, onOpenFeedback,
    onDeleteNote,
    onCommitPush, onPull, onResolveConflicts, onSetViewMode, onToggleBacklinks, onToggleDiff, onToggleRawEditor, onFindInNote, onReplaceInNote,
    noteWidth, defaultNoteWidth, onSetNoteWidth, onSetDefaultNoteWidth, onToggleTableOfContents, onOpenVault, onCreateEmptyVault,
    activeNoteModified,
    onZoomIn, onZoomOut, onZoomReset, zoomLevel,
    onSelect, onRenameFolder, onDeleteFolder, onRevealSelectedFolder, onCopySelectedFolderPath,
    onGoBack, onGoForward, canGoBack, canGoForward,
    onCheckForUpdates,
    onRemoveActiveVault, onRestoreGettingStarted, isGettingStartedHidden, vaultCount,
    onReloadVault, onRepairVault,
    locale, systemLocale, selectedUiLanguage, onSetUiLanguage, onSetThemeMode,
    onMoveNoteToFolder, canMoveNoteToFolder, onTurnCurrentBlockInto,
    onOpenInNewWindow, onRevealActiveFile, onCopyActiveFilePath, onCopyActiveDeepLink, onOpenActiveFileExternal, onExportNoteAsPdf,
    onRestoreDeletedNote, canRestoreDeletedNote,
    selection,
    gitFeaturesEnabled, isGitVault, gitRepositories, onInitializeGit, onPullRepository,
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
    onUndo, onRedo, canUndo, canRedo, undoLabel, redoLabel,
    onFindInNote, onReplaceInNote, onPastePlainText,
    onDeleteNote,
    onMoveNoteToFolder, canMoveNoteToFolder,
    onTurnCurrentBlockInto,
    onOpenInNewWindow,
    onRevealActiveFile, onCopyActiveFilePath, onOpenActiveFileExternal,
    onCopyActiveDeepLink, onExportNoteAsPdf,
    onRestoreDeletedNote, canRestoreDeletedNote,
  }), [
    hasActiveNote, activeTabPath, activeEntry?.fileKind, locale,
    folderCreateOptions, onCreateNote, onSave, onUndo, onRedo, canUndo, canRedo, undoLabel, redoLabel,
    onFindInNote, onReplaceInNote, onPastePlainText, onDeleteNote,
    onMoveNoteToFolder, canMoveNoteToFolder, onTurnCurrentBlockInto,
    onOpenInNewWindow,
    onRevealActiveFile, onCopyActiveFilePath, onOpenActiveFileExternal,
    onCopyActiveDeepLink, onExportNoteAsPdf,
    onRestoreDeletedNote, canRestoreDeletedNote,
  ])

  const gitCommands = useMemo(() => buildGitCommands({
    modifiedCount,
    gitFeaturesEnabled,
    isGitVault,
    repositories: gitRepositories,
    canAddRemote: config.canAddRemote ?? false,
    onAddRemote: config.onAddRemote,
    onCommitPush,
    onInitializeGit,
    onPull,
    onPullRepository,
    onResolveConflicts,
    onSelect,
  }), [
    modifiedCount, gitFeaturesEnabled, isGitVault, gitRepositories, config.canAddRemote, config.onAddRemote,
    onCommitPush, onInitializeGit, onPull, onPullRepository, onResolveConflicts, onSelect,
  ])

  const viewCommands = useMemo(() => buildViewCommands({
    hasActiveNote, activeNoteModified, onSetViewMode, onToggleBacklinks,
    onToggleDiff, onToggleRawEditor, noteWidth, defaultNoteWidth, onSetNoteWidth, onSetDefaultNoteWidth, onToggleTableOfContents, zoomLevel, onZoomIn, onZoomOut, onZoomReset,
  }), [
    hasActiveNote, activeNoteModified, onSetViewMode, onToggleBacklinks,
    onToggleDiff, onToggleRawEditor, noteWidth, defaultNoteWidth, onSetNoteWidth, onSetDefaultNoteWidth, onToggleTableOfContents,
    zoomLevel, onZoomIn, onZoomOut, onZoomReset,
  ])

  const settingsCommands = useMemo(() => buildSettingsCommands({
    vaultCount, isGettingStartedHidden,
    onOpenSettings, onOpenFeedback, onOpenVault, onCreateEmptyVault, onRemoveActiveVault, onRestoreGettingStarted,
    onCheckForUpdates, onReloadVault, onRepairVault,
    locale, systemLocale, selectedUiLanguage, onSetUiLanguage, onSetThemeMode,
  }), [
    vaultCount, isGettingStartedHidden, onOpenSettings, onOpenFeedback,
    onOpenVault, onCreateEmptyVault, onRemoveActiveVault, onRestoreGettingStarted,
    onCheckForUpdates, onReloadVault, onRepairVault,
    locale, systemLocale, selectedUiLanguage, onSetUiLanguage, onSetThemeMode,
  ])

  const commands = useMemo(() => [
    ...navigationCommands,
    ...noteCommands,
    ...gitCommands,
    ...viewCommands,
    ...settingsCommands,
  ], [
    navigationCommands, noteCommands, gitCommands, viewCommands,
    settingsCommands,
  ])

  return useMemo(() => localizeCommandActions(commands, locale), [commands, locale])
}
