import { useCallback, useMemo, useState } from 'react'
import type { RetargetOption } from '../components/note-retargeting/RetargetNoteDialog'
import type { FolderNode, VaultEntry } from '../types'
import { useNoteRetargeting, type RetargetFolderOption } from './useNoteRetargeting'
import { folderPathForRetargetEntry, prependVaultRootFolderDestination } from '../utils/noteRetargetingPaths'

type DialogState = { kind: 'folder'; notePath: string } | null

interface NoteRetargetingUiInput {
  activeEntry: VaultEntry | null
  activeNoteBlocked: boolean
  entries: VaultEntry[]
  folders: FolderNode[]
  setToastMessage: (message: string | null) => void
  vaultPath: string
  moveNoteToFolder: (
    path: string,
    folderPath: string,
    vaultPath: string,
    onEntryRenamed: (oldPath: string, newEntry: Partial<VaultEntry> & { path: string }, newContent: string) => void,
  ) => Promise<{ new_path: string } | null>
}

function buildFolderOptions(
  folders: RetargetFolderOption[],
  entry: VaultEntry | null,
  vaultPath: string,
): RetargetOption[] {
  if (!entry) return []

  const currentFolderPath = folderPathForRetargetEntry({ entry, vaultPath })
  return folders.map((folder) => ({
    id: folder.path,
    label: folder.label,
    detail: folder.path === folder.label ? undefined : folder.path,
    current: folder.path === currentFolderPath,
  }))
}

function resolveDialogEntry(
  dialogState: DialogState,
  entries: VaultEntry[],
  activeEntry: VaultEntry | null,
): VaultEntry | null {
  if (!dialogState) return null
  return (
    entries.find((entry) => entry.path === dialogState.notePath) ??
    (activeEntry?.path === dialogState.notePath ? activeEntry : null)
  )
}

function hasFolderRetargetDestination(
  activeEntry: VaultEntry | null,
  activeNoteBlocked: boolean,
  folders: RetargetFolderOption[],
  canDropNoteOnFolder: (notePath: string, folderPath: string) => boolean,
): boolean {
  return (
    !!activeEntry &&
    !activeNoteBlocked &&
    folders.some((folder) => canDropNoteOnFolder(activeEntry.path, folder.path))
  )
}

export function useNoteRetargetingUi(options: NoteRetargetingUiInput) {
  const { activeEntry, activeNoteBlocked, entries, folders, setToastMessage, vaultPath, moveNoteToFolder } = options
  const [dialogState, setDialogState] = useState<DialogState>(null)
  const { availableFolders, canDropNoteOnFolder, moveIntoFolder } = useNoteRetargeting({
    entries,
    folders,
    setToastMessage,
    vaultPath,
    moveNoteToFolder,
  })
  const folderDestinations = useMemo(
    () => prependVaultRootFolderDestination(availableFolders, vaultPath),
    [availableFolders, vaultPath],
  )
  const canMoveActiveNoteToFolder = hasFolderRetargetDestination(
    activeEntry,
    activeNoteBlocked,
    folderDestinations,
    canDropNoteOnFolder,
  )
  const dialogEntry = useMemo(
    () => resolveDialogEntry(dialogState, entries, activeEntry),
    [activeEntry, dialogState, entries],
  )
  const folderOptions = useMemo(
    () => buildFolderOptions(folderDestinations, dialogEntry, vaultPath),
    [dialogEntry, folderDestinations, vaultPath],
  )
  const openMoveNoteToFolderDialog = useCallback(() => {
    if (!activeEntry || !canMoveActiveNoteToFolder) return
    setDialogState({ kind: 'folder', notePath: activeEntry.path })
  }, [activeEntry, canMoveActiveNoteToFolder])
  const closeDialog = useCallback(() => setDialogState(null), [])
  const selectFolder = useCallback(async (folderPath: string) => {
    if (!dialogState) return false
    const result = await moveIntoFolder(dialogState.notePath, folderPath)
    return result !== 'error'
  }, [dialogState, moveIntoFolder])

  return {
    isDialogOpen: dialogState !== null,
    dialogState,
    dialogEntry,
    canMoveActiveNoteToFolder,
    openMoveNoteToFolderDialog,
    canDropNoteOnFolder,
    moveIntoFolder,
    folderOptions,
    closeDialog,
    selectFolder,
  }
}
