import { useCallback, useState } from 'react'
import type { SidebarSelection, VaultEntry } from '../../types'
import {
  folderLabel,
  invokeRenameFolder,
  type FolderTab,
  updateSelectionAfterFolderRename,
  updateTabsAfterFolderRename,
} from './folderActionUtils'

interface UseFolderRenameInput {
  activeTabPathRef: React.MutableRefObject<string | null>
  handleSwitchTab: (path: string) => void
  reloadFolders: () => Promise<unknown>
  reloadVault: () => Promise<VaultEntry[]>
  selection: SidebarSelection
  setSelection: (selection: SidebarSelection) => void
  setTabs: React.Dispatch<React.SetStateAction<FolderTab[]>>
  setToastMessage: (message: string | null) => void
  vaultPath: string
}

export function useFolderRename(options: UseFolderRenameInput) {
  const { activeTabPathRef, handleSwitchTab, reloadFolders, reloadVault, selection, setSelection, setTabs, setToastMessage, vaultPath } = options
  const [renamingFolder, setRenamingFolder] = useState<{ path: string; rootPath?: string } | null>(null)

  const cancelFolderRename = useCallback(() => setRenamingFolder(null), [])
  const startFolderRename = useCallback((folderPath: string, rootPath?: string) => {
    setRenamingFolder({ path: folderPath, rootPath })
  }, [])

  const renameFolder = useCallback(
    async (folderPath: string, nextName: string, rootPath?: string) => {
    const trimmedName = nextName.trim()
    if (trimmedName === folderLabel({ folderPath })) {
      setRenamingFolder(null)
      return true
    }

    try {
        const operationVaultPath = rootPath ?? vaultPath
        const renameResult = await invokeRenameFolder({
          vaultPath: operationVaultPath,
          folderPath,
          newName: trimmedName,
        })
      setRenamingFolder(null)
      await reloadFolders()
      const refreshedEntries = await reloadVault()
      updateTabsAfterFolderRename({
        activeTabPathRef,
        handleSwitchTab,
        refreshedEntries,
        renameResult,
        setTabs,
        vaultPath: operationVaultPath,
      })
      updateSelectionAfterFolderRename({
        renameResult,
        selection,
        setSelection,
        rootPath,
      })
      setToastMessage(`Renamed folder to "${trimmedName}"`)
      return true
    } catch (error) {
      setToastMessage(`Failed to rename folder: ${error}`)
      return false
    }
    },
    [
      activeTabPathRef,
      handleSwitchTab,
      reloadFolders,
      reloadVault,
      selection,
      setSelection,
      setTabs,
      setToastMessage,
      vaultPath,
    ],
  )

  const renameSelectedFolder = useCallback(() => {
    if (selection.kind !== 'folder' || !selection.path) return
    startFolderRename(selection.path, selection.rootPath)
  }, [selection, startFolderRename])

  return {
    cancelFolderRename,
    renameFolder,
    renameSelectedFolder,
    renamingFolderPath: renamingFolder?.path ?? null,
    renamingFolderRootPath: renamingFolder?.rootPath ?? null,
    startFolderRename,
  }
}
