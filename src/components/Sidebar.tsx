import { memo } from 'react'
import type { FolderCreationParent, FolderNode, SidebarSelection, VaultEntry } from '../types'
import { FolderTree } from './FolderTree'
import { SidebarTitleBar } from './sidebar/SidebarSections'
import { SidebarFolderLoadingSection } from './sidebar/SidebarLoadingSections'
import { useSidebarCollapsed } from './sidebar/sidebarHooks'
import type { AppLocale } from '../lib/i18n'
import type { FolderFileActions } from '../hooks/useFileActions'
import type { AllNotesFileVisibility } from '../utils/allNotesFileVisibility'

interface SidebarProps {
  entries: VaultEntry[]
  selection: SidebarSelection
  onSelect: (selection: SidebarSelection) => void
  folders?: FolderNode[]
  onCreateFolder?: (name: string, parent?: FolderCreationParent) => Promise<boolean> | boolean
  onRenameFolder?: (folderPath: string, nextName: string) => Promise<boolean> | boolean
  onDeleteFolder?: (folderPath: string) => void
  folderFileActions?: FolderFileActions
  renamingFolderPath?: string | null
  onStartRenameFolder?: (folderPath: string) => void
  onCancelRenameFolder?: () => void
  onCanDropNoteOnFolder?: (notePath: string, folderPath: string) => boolean
  onMoveNoteToFolder?: (notePath: string, folderPath: string) => Promise<unknown> | unknown
  vaultRootPath?: string
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
    | 'onSelect'
    | 'folders'
    | 'onCreateFolder'
    | 'onRenameFolder'
    | 'onDeleteFolder'
    | 'folderFileActions'
    | 'renamingFolderPath'
    | 'onStartRenameFolder'
    | 'onCancelRenameFolder'
    | 'onCanDropNoteOnFolder'
    | 'onMoveNoteToFolder'
    | 'vaultRootPath'
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
  | 'onStartRenameFolder'
  | 'onCancelRenameFolder'
  | 'onCanDropNoteOnFolder'
  | 'onMoveNoteToFolder'
  | 'vaultRootPath'
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
    onStartRenameFolder,
    onCancelRenameFolder,
    onCanDropNoteOnFolder,
    onMoveNoteToFolder,
    vaultRootPath,
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
      onStartRenameFolder={onStartRenameFolder}
      onCancelRenameFolder={onCancelRenameFolder}
      onCanDropNote={onCanDropNoteOnFolder}
      onMoveNoteToFolder={onMoveNoteToFolder}
      collapsed={groupCollapsed.folders}
      locale={locale}
      onToggle={() => toggleGroup('folders')}
      vaultRootPath={vaultRootPath}
    />
  )
}

function SidebarNavigation(props: SidebarNavigationProps) {
  return (
    <nav className="flex-1 overflow-y-auto">
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
