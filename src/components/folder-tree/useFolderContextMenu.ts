import { useCallback, type MouseEvent as ReactMouseEvent } from 'react'
import type { FolderNode } from '../../types'
import type { FolderFileActions } from '../../hooks/useFileActions'
import { requestCreateNoteInFolder } from '../../hooks/noteCreationRequests'
import { useSidebarContextMenu } from '../sidebar/sidebarHooks'

interface UseFolderContextMenuInput {
  onDeleteFolder?: (folderPath: string, rootPath?: string) => void
  folderFileActions?: FolderFileActions
  onCreateFolder?: (folderPath: string, rootPath?: string) => void
  onStartRenameFolder?: (folderPath: string, rootPath?: string) => void
}

export function useFolderContextMenu({
  onDeleteFolder,
  folderFileActions,
  onCreateFolder,
  onStartRenameFolder,
}: UseFolderContextMenuInput) {
  const {
    closeContextMenu,
    contextMenu,
    contextMenuRef,
    openContextMenuFromPointer,
  } = useSidebarContextMenu<{ path: string; rootPath?: string }>()

  const handleOpenMenu = useCallback((node: FolderNode, event: ReactMouseEvent<HTMLElement>) => {
    openContextMenuFromPointer({ path: node.path, rootPath: node.rootPath }, event)
  }, [openContextMenuFromPointer])

  const handleCreateNoteFromMenu = useCallback((folderPath: string, rootPath?: string) => {
    closeContextMenu()
    requestCreateNoteInFolder(folderPath, rootPath)
  }, [closeContextMenu])

  const handleCreateFolderFromMenu = useCallback((folderPath: string, rootPath?: string) => {
    closeContextMenu()
    onCreateFolder?.(folderPath, rootPath)
  }, [closeContextMenu, onCreateFolder])

  const handleRenameFromMenu = useCallback((folderPath: string, rootPath?: string) => {
    closeContextMenu()
    if (rootPath) onStartRenameFolder?.(folderPath, rootPath)
    else onStartRenameFolder?.(folderPath)
  }, [closeContextMenu, onStartRenameFolder])

  const handleDeleteFromMenu = useCallback((folderPath: string, rootPath?: string) => {
    closeContextMenu()
    if (rootPath) onDeleteFolder?.(folderPath, rootPath)
    else onDeleteFolder?.(folderPath)
  }, [closeContextMenu, onDeleteFolder])

  const handleRevealFromMenu = useCallback((folderPath: string, rootPath?: string) => {
    closeContextMenu()
    if (rootPath) folderFileActions?.revealFolder(folderPath, rootPath)
    else folderFileActions?.revealFolder(folderPath)
  }, [closeContextMenu, folderFileActions])

  const handleCopyPathFromMenu = useCallback((folderPath: string, rootPath?: string) => {
    closeContextMenu()
    if (rootPath) folderFileActions?.copyFolderPath(folderPath, rootPath)
    else folderFileActions?.copyFolderPath(folderPath)
  }, [closeContextMenu, folderFileActions])
  const menu = contextMenu ? {
    path: contextMenu.target.path,
    rootPath: contextMenu.target.rootPath,
    x: contextMenu.pos.x,
    y: contextMenu.pos.y,
  } : null

  return {
    closeContextMenu,
    contextMenu: menu,
    handleCopyPathFromMenu,
    handleCreateFolderFromMenu,
    handleCreateNoteFromMenu,
    handleDeleteFromMenu,
    handleOpenMenu,
    handleRevealFromMenu,
    handleRenameFromMenu,
    menuRef: contextMenuRef,
  }
}
