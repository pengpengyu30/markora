import type { VaultEntry } from '../../types'
import type { RetargetOption } from './RetargetNoteDialog'
import { RetargetNoteDialog } from './RetargetNoteDialog'

interface NoteRetargetingDialogsProps {
  dialogState: { kind: 'folder'; notePath: string } | null
  dialogEntry: VaultEntry | null
  folderOptions: RetargetOption[]
  onClose: () => void
  onSelectFolder: (folderPath: string) => boolean | Promise<boolean>
}

function folderDialogDescription(entry: VaultEntry | null): string {
  return entry
    ? `Choose a destination folder for "${entry.title}".`
    : 'Select a destination folder for the active note.'
}

export function NoteRetargetingDialogs({
  dialogState,
  dialogEntry,
  folderOptions,
  onClose,
  onSelectFolder,
}: NoteRetargetingDialogsProps) {
  return (
    <>
      <RetargetNoteDialog
        open={dialogState?.kind === 'folder'}
        title="Move Note to Folder"
        description={folderDialogDescription(dialogEntry)}
        searchPlaceholder="Search folders"
        emptyMessage="No other folders available."
        options={folderOptions}
        onClose={onClose}
        onSelect={onSelectFolder}
        testIdPrefix="retarget-note-folder"
      />
    </>
  )
}
