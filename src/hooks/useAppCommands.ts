import { useCallback } from 'react'
import type { AppLocale, UiLanguagePreference } from '../lib/i18n'
import type { ThemeMode } from '../lib/themeMode'
import { useAppKeyboard } from './useAppKeyboard'
import { useCommandRegistry } from './useCommandRegistry'
import type { CommandAction } from './useCommandRegistry'
import { useKeyboardNavigation } from './useKeyboardNavigation'
import { useMenuEvents } from './useMenuEvents'
import type { NoteWidthMode, SidebarSelection, SidebarFilter, VaultEntry } from '../types'
import type { ViewMode } from './useViewMode'
import type { ImmediateCreateOptions } from './useNoteCreation'
import type { NoteListMultiSelectionCommands } from '../components/note-list/multiSelectionCommands'
import type { RichEditorBlockTypeDefinition } from '../utils/richEditorBlockTypes'

interface AppCommandsConfig {
  activeTabPath: string | null
  activeTabPathRef: React.MutableRefObject<string | null>
  entries: VaultEntry[]
  visibleNotesRef: React.RefObject<VaultEntry[]>
  multiSelectionCommandRef: React.MutableRefObject<NoteListMultiSelectionCommands | null>
  selection: SidebarSelection
  onQuickOpen: () => void
  onCommandPalette: () => void
  onSearch: () => void
  onFindInNote?: () => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  undoLabel?: string | null
  redoLabel?: string | null
  onReplaceInNote?: () => void
  onPastePlainText: () => void
  onCreateNote: (options?: ImmediateCreateOptions) => void
  onSave: () => void
  onOpenSettings: () => void
  onDeleteNote: (path: string) => void
  onSetViewMode: (mode: ViewMode) => void
  onToggleBacklinks: () => void
  onToggleRawEditor?: () => void
  noteWidth?: NoteWidthMode
  defaultNoteWidth?: NoteWidthMode
  onSetNoteWidth?: (mode: NoteWidthMode) => void
  onSetDefaultNoteWidth?: (mode: NoteWidthMode) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  zoomLevel: number
  onSelect: (sel: SidebarSelection) => void
  onRenameFolder?: () => void
  onDeleteFolder?: () => void
  onReplaceActiveTab: (entry: VaultEntry) => void
  onSelectNote: (entry: VaultEntry) => void
  onGoBack?: () => void
  onGoForward?: () => void
  canGoBack?: boolean
  canGoForward?: boolean
  onOpenVault?: () => void
  onCreateEmptyVault?: () => void
  onToggleTableOfContents?: () => void
  onCheckForUpdates?: () => void
  onRemoveActiveVault?: () => void
  onRestoreGettingStarted?: () => void
  isGettingStartedHidden?: boolean
  vaultCount?: number
  locale?: AppLocale
  systemLocale?: AppLocale
  selectedUiLanguage?: UiLanguagePreference
  onSetUiLanguage?: (language: UiLanguagePreference) => void
  onSetThemeMode?: (mode: ThemeMode) => void
  onReloadVault?: () => void
  onRepairVault?: () => void
  onRestoreDeletedNote?: () => void
  onMoveNoteToFolder?: () => void
  canMoveNoteToFolder?: boolean
  onTurnCurrentBlockInto?: (target: RichEditorBlockTypeDefinition) => void
  onRevealActiveFile?: (path: string) => void
  onCopyActiveFilePath?: (path: string) => void
  onOpenActiveFileExternal?: (path: string) => void
  onExportNoteAsPdf?: () => void
  onRevealSelectedFolder?: () => void
  onCopySelectedFolderPath?: () => void
}

type CommandRegistryConfig = Parameters<typeof useCommandRegistry>[0]
type CommandRegistrySelectionState = Pick<
  CommandRegistryConfig,
  | 'onZoomIn'
  | 'onZoomOut'
  | 'onZoomReset'
  | 'zoomLevel'
  | 'onSelect'
  | 'onRenameFolder'
  | 'onDeleteFolder'
  | 'onRevealSelectedFolder'
  | 'onCopySelectedFolderPath'
  | 'onGoBack'
  | 'onGoForward'
  | 'canGoBack'
  | 'canGoForward'
  | 'selection'
>
type CommandRegistryCoreActions = Pick<
  CommandRegistryConfig,
  | 'activeTabPath'
  | 'entries'
  | 'onQuickOpen'
  | 'onCreateNote'
  | 'onSave'
  | 'onUndo'
  | 'onRedo'
  | 'canUndo'
  | 'canRedo'
  | 'undoLabel'
  | 'redoLabel'
  | 'onFindInNote'
  | 'onReplaceInNote'
  | 'onPastePlainText'
  | 'onTurnCurrentBlockInto'
  | 'onOpenSettings'
  | 'onDeleteNote'
  | 'onSetViewMode'
  | 'onToggleBacklinks'
  | 'onToggleRawEditor'
  | 'noteWidth'
  | 'defaultNoteWidth'
  | 'onSetNoteWidth'
  | 'onSetDefaultNoteWidth'
  | 'onToggleTableOfContents'
>
type CommandRegistryVaultActions = Pick<
  CommandRegistryConfig,
  | 'onOpenVault'
  | 'onCreateEmptyVault'
  | 'onCheckForUpdates'
  | 'locale'
  | 'systemLocale'
  | 'selectedUiLanguage'
  | 'onSetUiLanguage'
  | 'onSetThemeMode'
  | 'onRemoveActiveVault'
  | 'onRestoreGettingStarted'
  | 'isGettingStartedHidden'
  | 'vaultCount'
  | 'onReloadVault'
  | 'onRepairVault'
  | 'onRestoreDeletedNote'
  | 'onRevealActiveFile'
  | 'onCopyActiveFilePath'
  | 'onOpenActiveFileExternal'
>
type CommandRegistryNoteActions = Pick<
  CommandRegistryConfig,
  | 'onMoveNoteToFolder'
  | 'canMoveNoteToFolder'
  | 'onTurnCurrentBlockInto'
  | 'onExportNoteAsPdf'
>

function createKeyboardActions(
  config: AppCommandsConfig,
): Parameters<typeof useAppKeyboard>[0] {
  return {
    onQuickOpen: config.onQuickOpen,
    onCommandPalette: config.onCommandPalette,
    onSearch: config.onSearch,
    onFindInNote: config.onFindInNote,
    onReplaceInNote: config.onReplaceInNote,
    onPastePlainText: config.onPastePlainText,
    onCreateNote: config.onCreateNote,
    onSave: config.onSave,
    onUndo: config.onUndo,
    onRedo: config.onRedo,
    canUndo: config.canUndo,
    canRedo: config.canRedo,
    onOpenSettings: config.onOpenSettings,
    onDeleteNote: config.onDeleteNote,
    onSetViewMode: config.onSetViewMode,
    onZoomIn: config.onZoomIn,
    onZoomOut: config.onZoomOut,
    onZoomReset: config.onZoomReset,
    onGoBack: config.onGoBack,
    onGoForward: config.onGoForward,
    onToggleTableOfContents: config.onToggleTableOfContents,
    onToggleRawEditor: config.onToggleRawEditor,
    onToggleBacklinks: config.onToggleBacklinks,
    activeTabPathRef: config.activeTabPathRef,
    multiSelectionCommandRef: config.multiSelectionCommandRef,
  }
}

function createMenuEventHandlers(
  config: AppCommandsConfig,
  selectFilter: (filter: SidebarFilter) => void,
): Parameters<typeof useMenuEvents>[0] {
  return {
    ...createMenuEventActionHandlers(config, selectFilter),
    ...createMenuEventVaultHandlers(config),
    ...createMenuEventState(config),
  }
}

function createMenuEventActionHandlers(
  config: AppCommandsConfig,
  selectFilter: (filter: SidebarFilter) => void,
): Pick<
  Parameters<typeof useMenuEvents>[0],
  | 'onSetViewMode'
  | 'onCreateNote'
  | 'onQuickOpen'
  | 'onSave'
  | 'onOpenSettings'
  | 'onToggleBacklinks'
  | 'onCommandPalette'
  | 'onZoomIn'
  | 'onZoomOut'
  | 'onZoomReset'
  | 'onDeleteNote'
  | 'onFindInNote'
  | 'onUndo'
  | 'onRedo'
  | 'onReplaceInNote'
  | 'onPastePlainText'
  | 'onSearch'
  | 'onToggleRawEditor'
  | 'onToggleTableOfContents'
  | 'onExportNoteAsPdf'
  | 'onGoBack'
  | 'onGoForward'
  | 'onCheckForUpdates'
  | 'onSelectFilter'
> {
  return {
    onSetViewMode: config.onSetViewMode,
    onCreateNote: config.onCreateNote,
    onQuickOpen: config.onQuickOpen,
    onSave: config.onSave,
    onOpenSettings: config.onOpenSettings,
    onToggleBacklinks: config.onToggleBacklinks,
    onCommandPalette: config.onCommandPalette,
    onZoomIn: config.onZoomIn,
    onZoomOut: config.onZoomOut,
    onZoomReset: config.onZoomReset,
    onDeleteNote: config.onDeleteNote,
    onFindInNote: config.onFindInNote,
    onUndo: config.onUndo,
    onRedo: config.onRedo,
    onReplaceInNote: config.onReplaceInNote,
    onPastePlainText: config.onPastePlainText,
    onSearch: config.onSearch,
    onToggleRawEditor: config.onToggleRawEditor,
    onToggleTableOfContents: config.onToggleTableOfContents,
    onExportNoteAsPdf: config.onExportNoteAsPdf,
    onGoBack: config.onGoBack,
    onGoForward: config.onGoForward,
    onCheckForUpdates: config.onCheckForUpdates,
    onSelectFilter: selectFilter,
  }
}

function createMenuEventVaultHandlers(
  config: AppCommandsConfig,
): Pick<
  Parameters<typeof useMenuEvents>[0],
  | 'onOpenVault'
  | 'onRemoveActiveVault'
  | 'onRestoreGettingStarted'
  | 'onReloadVault'
  | 'onRepairVault'
> {
  return {
    onOpenVault: config.onOpenVault,
    onRemoveActiveVault: config.onRemoveActiveVault,
    onRestoreGettingStarted: config.onRestoreGettingStarted,
    onReloadVault: config.onReloadVault,
    onRepairVault: config.onRepairVault,
  }
}

function createMenuEventState(
  config: AppCommandsConfig,
): Pick<
  Parameters<typeof useMenuEvents>[0],
  | 'activeTabPathRef'
  | 'multiSelectionCommandRef'
  | 'activeTabPath'
> {
  return {
    activeTabPathRef: config.activeTabPathRef,
    multiSelectionCommandRef: config.multiSelectionCommandRef,
    activeTabPath: config.activeTabPath,
  }
}

function createCommandRegistrySelectionConfig(
  config: AppCommandsConfig,
): CommandRegistrySelectionState {
  return {
    onZoomIn: config.onZoomIn,
    onZoomOut: config.onZoomOut,
    onZoomReset: config.onZoomReset,
    zoomLevel: config.zoomLevel,
    onSelect: config.onSelect,
    onRenameFolder: config.onRenameFolder,
    onDeleteFolder: config.onDeleteFolder,
    onRevealSelectedFolder: config.onRevealSelectedFolder,
    onCopySelectedFolderPath: config.onCopySelectedFolderPath,
    onGoBack: config.onGoBack,
    onGoForward: config.onGoForward,
    canGoBack: config.canGoBack,
    canGoForward: config.canGoForward,
    selection: config.selection,
  }
}

function createCommandRegistryCoreConfig(
  config: AppCommandsConfig,
): CommandRegistryCoreActions {
  return {
    activeTabPath: config.activeTabPath,
    entries: config.entries,
    onQuickOpen: config.onQuickOpen,
    onCreateNote: config.onCreateNote,
    onSave: config.onSave,
    onUndo: config.onUndo,
    onRedo: config.onRedo,
    canUndo: config.canUndo,
    canRedo: config.canRedo,
    undoLabel: config.undoLabel,
    redoLabel: config.redoLabel,
    onOpenSettings: config.onOpenSettings,
    onDeleteNote: config.onDeleteNote,
    onSetViewMode: config.onSetViewMode,
    onToggleBacklinks: config.onToggleBacklinks,
    onToggleRawEditor: config.onToggleRawEditor,
    onFindInNote: config.onFindInNote,
    onReplaceInNote: config.onReplaceInNote,
    onPastePlainText: config.onPastePlainText,
    onTurnCurrentBlockInto: config.onTurnCurrentBlockInto,
    noteWidth: config.noteWidth,
    defaultNoteWidth: config.defaultNoteWidth,
    onSetNoteWidth: config.onSetNoteWidth,
    onSetDefaultNoteWidth: config.onSetDefaultNoteWidth,
    onToggleTableOfContents: config.onToggleTableOfContents,
  }
}

function createCommandRegistryVaultConfig(
  config: AppCommandsConfig,
): CommandRegistryVaultActions {
  return {
    onOpenVault: config.onOpenVault,
    onCreateEmptyVault: config.onCreateEmptyVault,
    onCheckForUpdates: config.onCheckForUpdates,
    locale: config.locale,
    systemLocale: config.systemLocale,
    selectedUiLanguage: config.selectedUiLanguage,
    onSetUiLanguage: config.onSetUiLanguage,
    onSetThemeMode: config.onSetThemeMode,
    onRemoveActiveVault: config.onRemoveActiveVault,
    onRestoreGettingStarted: config.onRestoreGettingStarted,
    isGettingStartedHidden: config.isGettingStartedHidden,
    vaultCount: config.vaultCount,
    onReloadVault: config.onReloadVault,
    onRepairVault: config.onRepairVault,
    onRestoreDeletedNote: config.onRestoreDeletedNote,
    onRevealActiveFile: config.onRevealActiveFile,
    onCopyActiveFilePath: config.onCopyActiveFilePath,
    onOpenActiveFileExternal: config.onOpenActiveFileExternal,
  }
}

function createCommandRegistryNoteConfig(
  config: AppCommandsConfig,
): CommandRegistryNoteActions {
  return {
    onMoveNoteToFolder: config.onMoveNoteToFolder,
    canMoveNoteToFolder: config.canMoveNoteToFolder,
    onExportNoteAsPdf: config.onExportNoteAsPdf,
  }
}

function createCommandRegistryConfig(config: AppCommandsConfig): CommandRegistryConfig {
  return {
    ...createCommandRegistryCoreConfig(config),
    ...createCommandRegistrySelectionConfig(config),
    ...createCommandRegistryVaultConfig(config),
    ...createCommandRegistryNoteConfig(config),
  }
}

/** Sets up keyboard shortcuts, command registry, menu events, and keyboard navigation. */
export function useAppCommands(config: AppCommandsConfig): CommandAction[] {
  const { onSelect } = config

  const selectFilter = useCallback((filter: SidebarFilter) => {
    onSelect({ kind: 'filter', filter })
  }, [onSelect])

  const keyboardActions = createKeyboardActions(config)
  const menuEventHandlers = createMenuEventHandlers(config, selectFilter)

  useAppKeyboard(keyboardActions)

  useMenuEvents(menuEventHandlers)

  const commands = useCommandRegistry(createCommandRegistryConfig(config))

  useKeyboardNavigation({
    activeTabPath: config.activeTabPath,
    visibleNotesRef: config.visibleNotesRef,
    onReplaceActiveTab: config.onReplaceActiveTab,
    onSelectNote: config.onSelectNote,
  })

  return commands
}
