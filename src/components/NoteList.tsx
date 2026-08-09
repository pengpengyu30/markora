import { memo, useEffect } from 'react'
import { NoteListLayout } from './note-list/NoteListLayout'
import { useNoteListModel, type NoteListProps } from './note-list/useNoteListModel'
import type { NoteListMultiSelectionCommands } from './note-list/multiSelectionCommands'
import { useMultiSelectKeyboard } from './note-list/useMultiSelectKeyboard'

type NoteListInnerProps = NoteListProps & {
  multiSelectionCommandRef?: React.MutableRefObject<NoteListMultiSelectionCommands | null>
}

function NoteListInner({ multiSelectionCommandRef, ...props }: NoteListInnerProps) {
  const model = useNoteListModel(props)

  useMultiSelectKeyboard({
    multiSelect: model.multiSelect,
    onBulkDelete: props.onBulkDeletePermanently ? model.handleBulkDeletePermanently : undefined,
    enableActionShortcuts: !multiSelectionCommandRef,
  })

  useEffect(() => {
    if (!multiSelectionCommandRef) return

    multiSelectionCommandRef.current = {
      selectedPaths: [...model.multiSelect.selectedPaths],
      deleteSelected: props.onBulkDeletePermanently ? model.handleBulkDeletePermanently : undefined,
    }

    return () => {
      multiSelectionCommandRef.current = null
    }
  }, [
    model.handleBulkDeletePermanently,
    model.multiSelect.selectedPaths,
    multiSelectionCommandRef,
    props.onBulkDeletePermanently,
  ])

  return <NoteListLayout {...model} />
}

export const NoteList = memo(NoteListInner)
