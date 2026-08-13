import { useCallback, useEffect, useState } from 'react'
import type { MutableRefObject } from 'react'
import type { RawEditorFindRequest } from './rawEditorFindTypes'

export interface EditorFindCommandTab {
  entry: {
    fileKind?: string
    path: string
  }
}

export interface EditorFindCommandOptions {
  activeTab: EditorFindCommandTab | null
  findInNoteRef?: MutableRefObject<((options?: { replace?: boolean }) => void) | null>
  handleToggleRawExclusive: () => void
  rawMode: boolean
}

/** Register the note find command and keep replace routed through the raw editor. */
export function useEditorFindCommand({
  activeTab,
  findInNoteRef,
  handleToggleRawExclusive,
  rawMode,
}: EditorFindCommandOptions): RawEditorFindRequest | null {
  const [findRequest, setFindRequest] = useState<RawEditorFindRequest | null>(null)
  const handleFindInNote = useCallback(
    (options: { replace?: boolean } = {}) => {
      if (!activeTab || activeTab.entry.fileKind === 'binary') return

      const replace = options.replace === true
      if (replace && !rawMode) handleToggleRawExclusive()

      setFindRequest((current) => ({
        id: (current?.id ?? 0) + 1,
        path: activeTab.entry.path,
        replace,
      }))
    },
    [activeTab, handleToggleRawExclusive, rawMode],
  )

  useEffect(() => {
    if (!findInNoteRef) return

    findInNoteRef.current = handleFindInNote
    return () => {
      if (findInNoteRef.current === handleFindInNote) {
        findInNoteRef.current = null
      }
    }
  }, [findInNoteRef, handleFindInNote])

  return findRequest
}
