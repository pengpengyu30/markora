import { memo } from 'react'
import type { FolderCreationParent, FolderNode, SidebarSelection, VaultEntry } from '../types'
import { FolderTree } from './FolderTree'
import { SidebarTitleBar } from './sidebar/SidebarSections'
import { SidebarFolderLoadingSection } from './sidebar/SidebarLoadingSections'
import { useSidebarCollapsed } from './sidebar/sidebarHooks'
import type { AppLocale } from '../lib/i18n'
import type { FolderFileActions } from '../hooks/useFileActions'
import type { AllNotesFileVisibility } from '../utils/allNotesFileVisibility'
import { SidebarTagsSection } from './SidebarTagsSection'

interface SidebarProps {
  entries: VaultEntry[]
  selectedTags?: string[]
  onToggleTag?: (tag: string) => void
  selection: SidebarSelection
  onSelect: (selection: SidebarSelection) => void
  folders?: FolderNode[]
  onCreateFolder?: (name: string, parent?: FolderCreationParent) => Promise<boolean> | boolean
  onRenameFolder?: (folderPath: string, nextName: string, rootPath?: string) => Promise<boolean> | boolean
  onDeleteFolder?: (folderPath: string, rootPath?: string) => void
  folderFileActions?: FolderFileActions
  renamingFolderPath?: string | null
  renamingFolderRootPath?: string | null
  onStartRenameFolder?: (folderPath: string, rootPath?: string) => void
  onCancelRenameFolder?: () => void
  onCanDropNoteOnFolder?: (notePath: string, folderPath: string) => boolean
  onMoveNoteToFolder?: (notePath: string, folderPath: string) => Promise<unknown> | unknown
  vaultRootPath?: string
  writableVaultPaths?: readonly string[]
  allNotesFileVisibility?: AllNotesFileVisibility
  locale?: AppLocale
  onCollapse?: () => void
  onGoBack?: () => void
  onGoForward?: () => void
  canGoBack?: boolean
  canGoForward?: boolean
  loading?: boolean
}

interface SidebarNavigationProps
  extends Pick<
    SidebarProps,
    | 'selection'
    | 'entries'
    | 'selectedTags'
    | 'onToggleTag'
    | 'onSelect'
    | 'folders'
    | 'onCreateFolder'
    | 'onRenameFolder'
    | 'onDeleteFolder'
    | 'folderFileActions'
    | 'renamingFolderPath'
    | 'renamingFolderRootPath'
    | 'onStartRenameFolder'
    | 'onCancelRenameFolder'
    | 'onCanDropNoteOnFolder'
    | 'onMoveNoteToFolder'
    | 'vaultRootPath'
    | 'writableVaultPaths'
    | 'locale'
    | 'loading'
  > {
  groupCollapsed: ReturnType<typeof useSidebarCollapsed>['collapsed']
  toggleGroup: ReturnType<typeof useSidebarCollapsed>['toggle']
}

type SidebarFoldersNavigationProps = Pick<
  SidebarNavigationProps,
  | 'folders'
  | 'selection'
  | 'onSelect'
  | 'onCreateFolder'
  | 'onRenameFolder'
  | 'onDeleteFolder'
  | 'folderFileActions'
  | 'renamingFolderPath'
  | 'renamingFolderRootPath'
  | 'onStartRenameFolder'
  | 'onCancelRenameFolder'
  | 'onCanDropNoteOnFolder'
  | 'onMoveNoteToFolder'
  | 'vaultRootPath'
  | 'writableVaultPaths'
  | 'groupCollapsed'
  | 'toggleGroup'
  | 'locale'
  | 'loading'
>

function SidebarFoldersNavigation(options: SidebarFoldersNavigationProps) {
  const {
    loading,
    folders,
    selection,
    onSelect,
    onCreateFolder,
    onRenameFolder,
    onDeleteFolder,
    folderFileActions,
    renamingFolderPath,
    renamingFolderRootPath,
    onStartRenameFolder,
    onCancelRenameFolder,
    onCanDropNoteOnFolder,
    onMoveNoteToFolder,
    vaultRootPath,
    writableVaultPaths,
    groupCollapsed,
    toggleGroup,
    locale,
  } = options

  if (loading) {
    return <SidebarFolderLoadingSection collapsed={groupCollapsed.folders} locale={locale} onToggle={() => toggleGroup('folders')} />
  }

  return (
    <FolderTree
      folders={folders ?? []}
      selection={selection}
      onSelect={onSelect}
      onCreateFolder={onCreateFolder}
      onRenameFolder={onRenameFolder}
      onDeleteFolder={onDeleteFolder}
      folderFileActions={folderFileActions}
      renamingFolderPath={renamingFolderPath}
      renamingFolderRootPath={renamingFolderRootPath}
      onStartRenameFolder={onStartRenameFolder}
      onCancelRenameFolder={onCancelRenameFolder}
      onCanDropNote={onCanDropNoteOnFolder}
      onMoveNoteToFolder={onMoveNoteToFolder}
      collapsed={groupCollapsed.folders}
      locale={locale}
      onToggle={() => toggleGroup('folders')}
      vaultRootPath={vaultRootPath}
      writableVaultPaths={writableVaultPaths}
    />
  )
}

function SidebarNavigation(props: SidebarNavigationProps) {
  return (
    <nav className="flex-1 overflow-y-auto">
      <SidebarTagsSection
        entries={props.entries}
        selectedTags={props.selectedTags ?? []}
        onToggleTag={props.onToggleTag ?? (() => {})}
        collapsed={props.groupCollapsed.tags}
        onToggle={() => props.toggleGroup('tags')}
        locale={props.locale ?? 'en'}
      />
      <SidebarFoldersNavigation {...props} />
    </nav>
  )
}

function useSidebarRuntime() {
  const { collapsed: groupCollapsed, toggle: toggleGroup } = useSidebarCollapsed()

  return { groupCollapsed, toggleGroup }
}

export const Sidebar = memo(function Sidebar(props: SidebarProps) {
  const locale = props.locale ?? 'en'
  const runtime = useSidebarRuntime()

  return (
    <aside className="flex h-full flex-col overflow-hidden border-r border-[var(--sidebar-border)] bg-sidebar text-sidebar-foreground">
      <SidebarTitleBar
        locale={locale}
        onCollapse={props.onCollapse}
        onGoBack={props.onGoBack}
        onGoForward={props.onGoForward}
        canGoBack={props.canGoBack}
        canGoForward={props.canGoForward}
      />
      <SidebarNavigation {...props} {...runtime} />
    </aside>
  )
})
