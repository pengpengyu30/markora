import { memo, useCallback, type MouseEvent as ReactMouseEvent } from 'react'
import type { FolderCreationParent, FolderNode, SidebarSelection } from '../../types'
import { FolderNameInput } from './FolderNameInput'
import { FolderItemRow } from './FolderItemRow'
import { FOLDER_ROW_CONTENT_INSET, getFolderConnectorLeft, getFolderDepthIndent } from './folderTreeLayout'
import { folderNodeKey } from './folderTreeUtils'
import { translate, type AppLocale } from '../../lib/i18n'

interface FolderTreeRowProps {
  depth: number
  expanded: Record<string, boolean>
  node: FolderNode
  creationParent?: FolderCreationParent
  isCreating?: boolean
  onCancelCreateFolder?: () => void
  onCreateFolderSubmit?: (value: string) => Promise<boolean>
  onDeleteFolder?: (folderPath: string, rootPath?: string) => void
  onOpenMenu: (node: FolderNode, event: ReactMouseEvent<HTMLElement>) => void
  onRenameFolder?: (folderPath: string, nextName: string, rootPath?: string) => Promise<boolean> | boolean
  onSelect: (selection: SidebarSelection) => void
  onToggle: (path: string) => void
  onCancelRenameFolder?: () => void
  onCanDropNote?: (notePath: string, folderPath: string) => boolean
  onMoveNoteToFolder?: (notePath: string, folderPath: string) => Promise<unknown> | unknown
  locale?: AppLocale
  renamingFolderPath?: string | null
  renamingFolderRootPath?: string | null
  rootPath?: string
  selection: SidebarSelection
  activeProjectPath?: string | null
  writableVaultPaths?: readonly string[]
}

function FolderRenameRow({
  contentInset,
  depthIndent,
  node,
  locale,
  onCancelRenameFolder,
  onRenameFolder,
  rootPath,
}: {
  contentInset: number
  depthIndent: number
  node: FolderNode
  locale: AppLocale
  onCancelRenameFolder: () => void
  onRenameFolder: (folderPath: string, nextName: string, rootPath?: string) => Promise<boolean> | boolean
  rootPath?: string
}) {
  return (
    <div style={{ paddingLeft: depthIndent }}>
      <FolderNameInput
        ariaLabel={translate(locale, 'sidebar.folder.name')}
        initialValue={node.name}
        placeholder={translate(locale, 'sidebar.folder.name')}
        leftInset={contentInset}
        selectTextOnFocus={true}
        submitOnBlur={true}
        testId="rename-folder-input"
        onCancel={onCancelRenameFolder}
        onSubmit={(nextName) => {
          const nodeRootPath = node.rootPath ?? rootPath
          return nodeRootPath
            ? onRenameFolder(node.path, nextName, nodeRootPath)
            : onRenameFolder(node.path, nextName)
        }}
      />
    </div>
  )
}

function FolderCreateRow({
  contentInset,
  depth,
  node,
  locale,
  onCancelCreateFolder,
  onCreateFolderSubmit,
}: {
  contentInset: number
  depth: number
  node: FolderNode
  locale: AppLocale
  onCancelCreateFolder: () => void
  onCreateFolderSubmit: (value: string) => Promise<boolean>
}) {
  return (
    <div data-testid={`folder-create-parent:${node.path}`} style={{ paddingLeft: getFolderDepthIndent(depth + 1) }}>
      <FolderNameInput
        ariaLabel={translate(locale, 'sidebar.folder.newName')}
        initialValue=""
        leftInset={contentInset}
        placeholder={translate(locale, 'sidebar.folder.name')}
        submitOnBlur={true}
        testId="new-folder-input"
        onCancel={onCancelCreateFolder}
        onSubmit={onCreateFolderSubmit}
      />
    </div>
  )
}

function FolderCreateRowSlot(options: {
  contentInset: number
  creationParent?: FolderCreationParent
  depth: number
  isCreating: boolean
  node: FolderNode
  locale: AppLocale
  onCancelCreateFolder?: () => void
  onCreateFolderSubmit?: (value: string) => Promise<boolean>
  rootPath?: string
}) {
  const {
    contentInset,
    creationParent,
    depth,
    isCreating,
    node,
    locale,
    onCancelCreateFolder,
    onCreateFolderSubmit,
    rootPath,
  } = options
  if (!isCreating) return null
  if (!creationParentMatchesNode(creationParent, node, rootPath)) return null
  if (!onCancelCreateFolder || !onCreateFolderSubmit) return null

  return (
    <FolderCreateRow
      contentInset={contentInset}
      depth={depth}
      node={node}
      locale={locale}
      onCancelCreateFolder={onCancelCreateFolder}
      onCreateFolderSubmit={onCreateFolderSubmit}
    />
  )
}

function FolderChildren(options: FolderTreeRowProps) {
  const {
    creationParent,
    depth,
    expanded,
    isCreating,
    node,
    onCancelCreateFolder,
    onCreateFolderSubmit,
    onDeleteFolder,
    onOpenMenu,
    onRenameFolder,
    onSelect,
    onToggle,
    onCancelRenameFolder,
    onCanDropNote,
    onMoveNoteToFolder,
    locale,
    renamingFolderPath,
    renamingFolderRootPath,
    rootPath,
    selection,
    activeProjectPath,
    writableVaultPaths,
  } = options
  const isExpanded = expanded[folderNodeKey({ path: node.path, rootPath: node.rootPath ?? rootPath })] ?? false
  const hasChildren = node.children.length > 0
  if (!isExpanded || !hasChildren) return null

  return (
    <div className="relative" data-testid={`folder-children:${node.path}`}>
      <div
        className="absolute top-0 bottom-0 bg-border"
        data-testid={`folder-connector:${node.path}`}
        style={{ left: getFolderConnectorLeft(depth), width: 1 }}
      />
      {node.children.map((child) => (
        <FolderTreeRow
          key={folderNodeKey({
            path: child.path,
            rootPath: child.rootPath ?? rootPath,
          })}
          depth={depth + 1}
          expanded={expanded}
          node={child}
          creationParent={creationParent}
          isCreating={isCreating}
          onCancelCreateFolder={onCancelCreateFolder}
          onCreateFolderSubmit={onCreateFolderSubmit}
          onDeleteFolder={onDeleteFolder}
          onOpenMenu={onOpenMenu}
          onRenameFolder={onRenameFolder}
          onSelect={onSelect}
          onToggle={onToggle}
          onCancelRenameFolder={onCancelRenameFolder}
          onCanDropNote={onCanDropNote}
          onMoveNoteToFolder={onMoveNoteToFolder}
          locale={locale}
          renamingFolderPath={renamingFolderPath}
          renamingFolderRootPath={renamingFolderRootPath}
          rootPath={rootPath}
          selection={selection}
          activeProjectPath={activeProjectPath}
          writableVaultPaths={writableVaultPaths}
        />
      ))}
    </div>
  )
}

function creationParentMatchesNode(
  creationParent: FolderCreationParent | undefined,
  node: FolderNode,
  defaultRootPath?: string,
): boolean {
  if (!creationParent || creationParent.path !== node.path) return false
  const nodeRootPath = node.rootPath ?? defaultRootPath
  const creationRootPath = creationParent.rootPath ?? defaultRootPath
  return nodeRootPath === creationRootPath
}

function folderSelectionMatches(selection: SidebarSelection, node: FolderNode, defaultRootPath?: string): boolean {
  if (selection.kind !== 'folder' || selection.path !== node.path) return false

  const nodeRootPath = node.rootPath ?? defaultRootPath
  if (!nodeRootPath) return !selection.rootPath
  if (selection.rootPath) return selection.rootPath === nodeRootPath
  return nodeRootPath === defaultRootPath
}

function selectionForFolder(path: string, rootPath?: string): SidebarSelection {
  return rootPath ? { kind: 'folder', path, rootPath } : { kind: 'folder', path }
}

export const FolderTreeRow = memo(function FolderTreeRow(options: FolderTreeRowProps) {
  const {
    creationParent,
    depth,
    expanded,
    isCreating = false,
    node,
    onCancelCreateFolder,
    onCreateFolderSubmit,
    onDeleteFolder,
    onOpenMenu,
    onRenameFolder,
    onSelect,
    onToggle,
    onCancelRenameFolder,
    onCanDropNote,
    onMoveNoteToFolder,
    locale = 'en',
    renamingFolderPath,
    renamingFolderRootPath,
    rootPath,
    selection,
    activeProjectPath,
    writableVaultPaths,
  } = options
  const { nodeKey, nodeRootPath, isExpanded, isSelected, isActiveProject, canUseDefaultFolderActions, isRenaming } = resolveFolderTreeRowState(options)
  const depthIndent = getFolderDepthIndent(depth)
  const contentInset = FOLDER_ROW_CONTENT_INSET
  const selectFolder = useCallback(() => {
    onSelect(selectionForFolder(node.path, nodeRootPath))
  }, [node.path, nodeRootPath, onSelect])
  const row = (
    <FolderItemRow
      canOpenMenu={canUseDefaultFolderActions}
      contentInset={contentInset}
      depthIndent={depthIndent}
      isExpanded={isExpanded}
      isSelected={isSelected}
      isActiveProject={isActiveProject}
      node={node}
      onOpenMenu={onOpenMenu}
      onSelect={selectFolder}
      onToggle={() => onToggle(nodeKey)}
      onCanDropNote={onCanDropNote}
      onMoveNoteToFolder={onMoveNoteToFolder}
    />
  )

  return (
    <>
      {isRenaming && onRenameFolder && onCancelRenameFolder ? (
      <FolderRenameRow
          contentInset={contentInset}
          depthIndent={depthIndent}
          node={node}
          locale={locale}
          onCancelRenameFolder={onCancelRenameFolder}
          onRenameFolder={onRenameFolder}
          rootPath={rootPath}
        />
      ) : (
        row
      )}
      <FolderCreateRowSlot
        contentInset={contentInset}
        creationParent={creationParent}
        depth={depth}
        isCreating={isCreating}
        node={node}
        locale={locale}
        onCancelCreateFolder={onCancelCreateFolder}
        onCreateFolderSubmit={onCreateFolderSubmit}
        rootPath={rootPath}
      />
      <FolderChildren
        creationParent={creationParent}
        depth={depth}
        expanded={expanded}
        isCreating={isCreating}
        node={node}
        onCancelCreateFolder={onCancelCreateFolder}
        onCreateFolderSubmit={onCreateFolderSubmit}
        onDeleteFolder={onDeleteFolder}
        onOpenMenu={onOpenMenu}
        onRenameFolder={onRenameFolder}
        onSelect={onSelect}
        onToggle={onToggle}
        onCancelRenameFolder={onCancelRenameFolder}
        onCanDropNote={onCanDropNote}
        onMoveNoteToFolder={onMoveNoteToFolder}
        locale={locale}
        renamingFolderPath={renamingFolderPath}
        renamingFolderRootPath={renamingFolderRootPath}
        rootPath={rootPath}
        selection={selection}
        activeProjectPath={activeProjectPath}
        writableVaultPaths={writableVaultPaths}
      />
    </>
  )
})

function resolveFolderTreeRowState(options: Pick<FolderTreeRowProps, 'activeProjectPath' | 'expanded' | 'node' | 'renamingFolderPath' | 'renamingFolderRootPath' | 'rootPath' | 'selection' | 'writableVaultPaths'>) {
  const { activeProjectPath, expanded, node, renamingFolderPath, renamingFolderRootPath, rootPath, selection, writableVaultPaths } = options
  const nodeRootPath = node.rootPath ?? rootPath
  const nodeKey = folderNodeKey({ path: node.path, rootPath: nodeRootPath })
  const canUseDefaultFolderActions = !nodeRootPath
    || (writableVaultPaths ? writableVaultPaths.includes(nodeRootPath) : nodeRootPath === rootPath)
  const canMutateFolder = node.path.length > 0 && canUseDefaultFolderActions
  return {
    nodeKey,
    nodeRootPath,
    isExpanded: (Reflect.get(expanded, nodeKey) as boolean | undefined) ?? false,
    isSelected: folderSelectionMatches(selection, { ...node, rootPath: nodeRootPath }, rootPath),
    isActiveProject: selection.kind !== 'folder'
      && node.path === ''
      && nodeRootPath != null
      && nodeRootPath === activeProjectPath,
    canUseDefaultFolderActions,
    isRenaming: canMutateFolder
      && renamingFolderPath === node.path
      && (renamingFolderRootPath == null || renamingFolderRootPath === nodeRootPath),
  }
}
