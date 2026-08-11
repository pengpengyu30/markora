import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import type { AppLocale } from '../../lib/i18n'
import type { VaultEntry } from '../../types'
import { isMarkdownEntry } from '../../utils/typeDefinitions'
import { NoteListContextMenuNode, NoteListRenameDialog } from './NoteListContextMenuView'

export type NoteListContextMenuState = {
  x: number
  y: number
  entry: VaultEntry
}

interface NoteListContextMenuParams {
  locale?: AppLocale
  onRenameFilename?: (path: string, newFilenameStem: string) => void
  onDeletePaths?: (paths: string[]) => void
  onExportPdf?: (entry: VaultEntry) => void
  onRevealFile?: (path: string) => void
  onCopyFilePath?: (path: string) => void
}

function hasNoteListContextActions(options: NoteListContextMenuParams & { entry: VaultEntry }) {
  const {
    entry,
    onRenameFilename,
    onDeletePaths,
    onExportPdf,
    onRevealFile,
    onCopyFilePath,
  } = options
  return [
    onRenameFilename && isMarkdownEntry(entry),
    onExportPdf && isMarkdownEntry(entry),
    onDeletePaths,
    onRevealFile,
    onCopyFilePath,
  ].some(Boolean)
}

export function useNoteListContextMenu(options: NoteListContextMenuParams) {
  const {
    locale = 'en',
    onRenameFilename,
    onDeletePaths,
    onExportPdf,
    onRevealFile,
    onCopyFilePath,
  } = options
  const [ctxMenu, setCtxMenu] = useState<NoteListContextMenuState | null>(null)
  const [renameEntry, setRenameEntry] = useState<VaultEntry | null>(null)
  const ctxMenuRef = useRef<HTMLDivElement>(null)
  const closeContextMenu = useCallback(() => {
    setCtxMenu(null)
  }, [])
  const closeRenameDialog = useCallback(() => {
    setRenameEntry(null)
  }, [])
  const requestRename = useCallback((entry: VaultEntry) => {
    setRenameEntry(entry)
  }, [])
  const submitRename = useCallback(
    (newFilenameStem: string) => {
    if (!renameEntry) return
    onRenameFilename?.(renameEntry.path, newFilenameStem)
    setRenameEntry(null)
    },
    [onRenameFilename, renameEntry],
  )

  useEffect(() => {
    if (!ctxMenu) return

    const handleOutsideClick = (event: MouseEvent) => {
      if (ctxMenuRef.current && !ctxMenuRef.current.contains(event.target as Node)) closeContextMenu()
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeContextMenu()
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [ctxMenu, closeContextMenu])

  const handleNoteContextMenu = useCallback(
    (entry: VaultEntry, event: ReactMouseEvent) => {
      if (
        !hasNoteListContextActions({
          entry,
          onRenameFilename,
          onDeletePaths,
          onExportPdf,
          onRevealFile,
          onCopyFilePath,
        })
      )
        return
      event.preventDefault()
      event.stopPropagation()
      setCtxMenu({ x: event.clientX, y: event.clientY, entry })
    },
    [
      onCopyFilePath,
      onDeletePaths,
      onExportPdf,
      onRenameFilename,
      onRevealFile,
    ],
  )

  const contextMenuNode = (
    <>
      <NoteListContextMenuNode
        ctxMenu={ctxMenu}
        ctxMenuRef={ctxMenuRef}
        locale={locale}
        onRequestRename={onRenameFilename ? requestRename : undefined}
        onDeletePaths={onDeletePaths}
        onExportPdf={onExportPdf}
        onRevealFile={onRevealFile}
        onCopyFilePath={onCopyFilePath}
        onClose={closeContextMenu}
      />
      <NoteListRenameDialog entry={renameEntry} locale={locale} onClose={closeRenameDialog} onRename={submitRename} />
    </>
  )

  return {
    handleNoteContextMenu,
    contextMenuNode,
  }
}
