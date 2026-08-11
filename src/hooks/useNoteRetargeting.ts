import { useCallback, useMemo } from 'react'
import type { FolderNode, VaultEntry } from '../types'
import {
  flattenRetargetFolders,
  folderPathForRetargetEntry,
  normalizeRetargetFolderPath,
} from '../utils/noteRetargetingPaths'

type RetargetResult = 'updated' | 'noop' | 'error'

export type { RetargetFolderOption } from '../utils/noteRetargetingPaths'

interface NoteRetargetingInput {
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

function entryByPath(params: { entries: VaultEntry[]; notePath: string }): VaultEntry | undefined {
  return params.entries.find((entry) => entry.path === params.notePath)
}

function canRetargetEntryToFolder(params: {
  entry: VaultEntry | undefined
  folderPath: string
  vaultPath: string
}): boolean {
  if (!params.entry) return false
  return (
    folderPathForRetargetEntry({
      entry: params.entry,
      vaultPath: params.vaultPath,
    }) !== normalizeRetargetFolderPath(params.folderPath)
  )
}

async function moveEntryToFolder({
  entry,
  notePath,
  folderPath,
  vaultPath,
  moveNoteToFolder,
}: {
  entry: VaultEntry | undefined
  notePath: string
  folderPath: string
  vaultPath: string
  moveNoteToFolder: (
    path: string,
    folderPath: string,
    vaultPath: string,
    onEntryRenamed: (oldPath: string, newEntry: Partial<VaultEntry> & { path: string }, newContent: string) => void,
  ) => Promise<{ new_path: string } | null>
}): Promise<RetargetResult> {
  const normalizedFolderPath = normalizeRetargetFolderPath(folderPath)
  if (!entry) return 'error'
  if (folderPathForRetargetEntry({ entry, vaultPath }) === normalizedFolderPath) return 'noop'

  const result = await moveNoteToFolder(notePath, normalizedFolderPath, vaultPath, () => undefined)
  if (!result) return 'error'
  if (result.new_path === notePath) return 'noop'
  return 'updated'
}

export function useNoteRetargeting(options: NoteRetargetingInput) {
  const { entries, folders, vaultPath, moveNoteToFolder } = options
  const availableFolders = useMemo(() => flattenRetargetFolders(folders), [folders])

  const canDropNoteOnFolder = useCallback(
    (notePath: string, folderPath: string) => {
      return canRetargetEntryToFolder({ entry: entryByPath({ entries, notePath }), folderPath, vaultPath })
    },
    [entries, vaultPath],
  )

  const moveIntoFolder = useCallback(
    async (notePath: string, folderPath: string): Promise<RetargetResult> => {
      return moveEntryToFolder({ entry: entryByPath({ entries, notePath }), notePath, folderPath, vaultPath, moveNoteToFolder })
    },
    [entries, moveNoteToFolder, vaultPath],
  )

  return {
    availableFolders,
    canDropNoteOnFolder,
    moveIntoFolder,
  }
}
