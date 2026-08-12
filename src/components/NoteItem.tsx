import type {
  CSSProperties,
  DragEventHandler,
  MouseEvent as ReactMouseEvent,
  MouseEventHandler,
  ReactNode,
} from 'react'
import type { VaultEntry, NoteStatus } from '../types'
import { cn } from '@/lib/utils'
import { getDisplayDate } from '../utils/noteListHelpers'
import { formatTimestampForDateDisplay } from '../utils/dateDisplay'
import { filePreviewKind, type FilePreviewKind } from '../utils/filePreview'
import { useDateDisplayFormat } from '../hooks/useAppPreferences'
import { writeNoteDragData } from '../utils/noteDragDrop'

type VisibleNoteStatus = Exclude<NoteStatus, 'clean'>

const NOTE_STATUS_DOT: Record<VisibleNoteStatus, { color: string; testId: string; title: string }> = {
  pendingSave: {
    color: 'var(--accent-green)',
    testId: 'pending-save-indicator',
    title: 'Saving to disk…',
  },
  unsaved: {
    color: 'var(--accent-green)',
    testId: 'unsaved-indicator',
    title: 'Saving to disk…',
  },
}

function hasStatusDot(noteStatus: NoteStatus): noteStatus is VisibleNoteStatus {
  return noteStatus !== 'clean'
}

function StatusDot({ noteStatus }: { noteStatus: VisibleNoteStatus }) {
  const dot = Reflect.get(NOTE_STATUS_DOT, noteStatus) as {
    color: string
    testId: string
    title: string
  }
  return (
    <span
      className="mr-1.5 inline-block align-middle"
      style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: dot.color,
        verticalAlign: 'middle',
      }}
      data-testid={dot.testId}
      title={dot.title}
    />
  )
}

type NoteItemVisualState = {
  isUnavailableBinary: boolean
  isSelected: boolean
  isMultiSelected: boolean
  isHighlighted: boolean
}

type NoteItemRowState = 'binary' | 'multiSelected' | 'selected' | 'highlighted' | 'default'

type NoteItemSurfaceProps = {
  className: string
  draggable: boolean
  style: CSSProperties
  onClick: MouseEventHandler<HTMLDivElement>
  onContextMenu?: MouseEventHandler<HTMLDivElement>
  onDragStart?: DragEventHandler<HTMLDivElement>
  onMouseEnter?: () => void
  title?: string
  testId?: string
}

const NOTE_ITEM_BASE_CLASS_NAME =
  'relative w-full border-0 border-b border-[var(--border)] bg-transparent p-0 text-left transition-colors'
const BINARY_NOTE_STYLE: CSSProperties = { padding: '14px 16px' }
const NOTE_ITEM_ROW_CLASS_NAMES: Record<NoteItemRowState, string> = {
  binary: 'cursor-default opacity-50',
  multiSelected: 'cursor-pointer',
  selected: 'cursor-pointer border-l-[3px]',
  highlighted: 'cursor-pointer bg-muted hover:bg-muted',
  default: 'cursor-pointer hover:bg-muted',
}

function resolveNoteItemRowState({
  isUnavailableBinary,
  isSelected,
  isMultiSelected,
  isHighlighted,
}: NoteItemVisualState): NoteItemRowState {
  if (isUnavailableBinary) return 'binary'
  if (isMultiSelected) return 'multiSelected'
  if (isSelected) return 'selected'
  if (isHighlighted) return 'highlighted'
  return 'default'
}

function noteItemClassName(state: NoteItemVisualState) {
  return cn(NOTE_ITEM_BASE_CLASS_NAME, NOTE_ITEM_ROW_CLASS_NAMES[resolveNoteItemRowState(state)])
}

function NoteSnippet({ snippet }: { snippet?: string | null }) {
  if (!snippet) return null

  return (
    <div
      className="text-[12px] leading-[1.5] text-muted-foreground"
      data-testid="note-snippet"
      style={{
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    >
      {snippet}
    </div>
  )
}

function noteListFilename(entry: Pick<VaultEntry, 'filename' | 'fileKind'>): string {
  if (entry.fileKind === 'text' || entry.fileKind === 'binary') return entry.filename
  return entry.filename.replace(/\.md$/iu, '')
}

function InteractiveNoteDetails({
  entry,
  noteStatus,
  isSelected,
  showFilename,
}: {
  entry: VaultEntry
  noteStatus: NoteStatus
  isSelected: boolean
  showFilename: boolean
}) {
  return (
    <>
      <NoteTitleRow entry={entry} isBinary={false} isSelected={isSelected} noteStatus={noteStatus} showFilename={showFilename} />
      <NoteSnippet snippet={entry.snippet} />
      <NoteDateRow entry={entry} />
    </>
  )
}

function StandardNoteContent(options: {
  entry: VaultEntry
  isBinary: boolean
  isUnavailableBinary: boolean
  noteStatus: NoteStatus
  isSelected: boolean
  showFilename: boolean
}) {
  const {
    entry,
    isBinary,
    isUnavailableBinary,
    noteStatus,
    isSelected,
    showFilename,
  } = options

  return (
    <>
      <div className="space-y-2" data-testid="note-content-stack">
        {isBinary ? (
          <NoteTitleRow entry={entry} isBinary={isUnavailableBinary} isSelected={isSelected} noteStatus={noteStatus} showFilename={showFilename} />
        ) : (
          <InteractiveNoteDetails
            entry={entry}
            noteStatus={noteStatus}
            isSelected={isSelected}
            showFilename={showFilename}
          />
        )}
      </div>
    </>
  )
}

function NoteTitleRow({
  entry,
  isBinary,
  isSelected,
  noteStatus,
  showFilename,
}: {
  entry: VaultEntry
  isBinary: boolean
  isSelected: boolean
  noteStatus: NoteStatus
  showFilename: boolean
}) {
  return (
    <div
      className={cn(
        'truncate pr-5 text-[13px]',
        isBinary ? 'text-muted-foreground' : 'text-foreground',
        isSelected && !isBinary ? 'font-semibold' : 'font-medium',
      )}
      data-testid="note-title-row"
    >
      {hasStatusDot(noteStatus) && !isBinary && <StatusDot noteStatus={noteStatus} />}
      {showFilename ? noteListFilename(entry) : entry.title}
    </div>
  )
}

function NoteDateRow({ entry }: { entry: VaultEntry }) {
  const dateDisplayFormat = useDateDisplayFormat()
  const modifiedLabel = formatTimestampForDateDisplay(getDisplayDate(entry), dateDisplayFormat)
  const createdLabel = entry.createdAt
    ? `Created ${formatTimestampForDateDisplay(entry.createdAt, dateDisplayFormat)}`
    : null

  if (!modifiedLabel && !createdLabel) return null

  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-[10px] text-muted-foreground"
      data-testid="note-date-row"
    >
      <span>{modifiedLabel}</span>
      <span className="flex min-w-0 items-center justify-end gap-1.5 text-right">
        {createdLabel && <span>{createdLabel}</span>}
      </span>
    </div>
  )
}

function noteItemStyle(
  isSelected: boolean,
  isMultiSelected: boolean,
): CSSProperties {
  const base: CSSProperties = {
    padding: isSelected && !isMultiSelected ? '14px 16px 14px 13px' : '14px 16px',
  }
  if (isMultiSelected) base.backgroundColor = 'color-mix(in srgb, var(--accent-blue) 10%, transparent)'
  else if (isSelected) {
    base.borderLeftColor = 'var(--accent-green)'
    base.backgroundColor = 'var(--accent-green-light)'
  }
  return base
}

type NoteItemProps = {
  entry: VaultEntry
  isSelected: boolean
  isMultiSelected?: boolean
  isHighlighted?: boolean
  noteStatus?: NoteStatus
  showFilename?: boolean
  onClickNote: (entry: VaultEntry, e: ReactMouseEvent) => void
  onPrefetch?: (entry: VaultEntry) => void
  onContextMenu?: (entry: VaultEntry, e: ReactMouseEvent) => void
}

function createNoteItemClickHandler(
  entry: VaultEntry,
  isUnavailableBinary: boolean,
  onClickNote: NoteItemProps['onClickNote'],
) {
  if (isUnavailableBinary) {
    return (event: ReactMouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
    }
  }
  return (event: ReactMouseEvent) => {
    onClickNote(entry, event)
  }
}

function resolveNoteItemSurfaceStyle({
  isUnavailableBinary,
  isSelected,
  isMultiSelected,
}: Pick<NoteItemVisualState, 'isUnavailableBinary' | 'isSelected' | 'isMultiSelected'>) {
  if (isUnavailableBinary) return BINARY_NOTE_STYLE
  return noteItemStyle(isSelected, isMultiSelected)
}

function resolveNoteItemTestId({
  isMultiSelected,
  previewKind,
  isUnavailableBinary,
}: Pick<NoteItemVisualState, 'isMultiSelected' | 'isUnavailableBinary'> & {
  previewKind: FilePreviewKind | null
}) {
  if (isMultiSelected) return 'multi-selected-item'
  if (previewKind) return `${previewKind}-file-item`
  return isUnavailableBinary ? 'binary-file-item' : undefined
}

function resolveNoteItemTitle({
  previewKind,
  isUnavailableBinary,
}: Pick<NoteItemVisualState, 'isUnavailableBinary'> & {
  previewKind: FilePreviewKind | null
}) {
  if (previewKind === 'image') return 'Open image preview'
  if (previewKind === 'pdf') return 'Open PDF preview'
  if (previewKind === 'audio') return 'Open audio preview'
  if (previewKind === 'video') return 'Open video preview'
  return isUnavailableBinary ? 'Cannot open this file type' : undefined
}

function resolveNoteItemSurfaceProps(
  options: NoteItemVisualState & {
    entry: VaultEntry
    previewKind: FilePreviewKind | null
    onClickNote: NoteItemProps['onClickNote']
    onPrefetch?: NoteItemProps['onPrefetch']
    onContextMenu?: NoteItemProps['onContextMenu']
  },
): NoteItemSurfaceProps {
  const {
    entry,
    isUnavailableBinary,
    previewKind,
    isSelected,
    isMultiSelected,
    isHighlighted,
    onClickNote,
    onPrefetch,
    onContextMenu,
  } = options
  const draggable =
    !isUnavailableBinary &&
    (entry.fileKind === undefined || entry.fileKind === 'markdown')

  return {
    className: noteItemClassName({
      isUnavailableBinary,
      isSelected,
      isMultiSelected,
      isHighlighted,
    }),
    draggable,
    style: resolveNoteItemSurfaceStyle({
      isUnavailableBinary,
      isSelected,
      isMultiSelected,
    }),
    onClick: createNoteItemClickHandler(entry, isUnavailableBinary, onClickNote),
    onContextMenu: onContextMenu ? (event) => onContextMenu(entry, event) : undefined,
    onDragStart: draggable ? (event) => writeNoteDragData(event.dataTransfer, entry.path) : undefined,
    onMouseEnter: entry.fileKind !== 'binary' && onPrefetch ? () => onPrefetch(entry) : undefined,
    testId: resolveNoteItemTestId({
      isMultiSelected,
      previewKind,
      isUnavailableBinary,
    }),
    title: resolveNoteItemTitle({ previewKind, isUnavailableBinary }),
  }
}

function NoteItemRow({
  surfaceProps,
  entryPath,
  isSelected,
  isMultiSelected,
  isHighlighted,
  children,
}: {
  surfaceProps: NoteItemSurfaceProps
  entryPath: string
  isSelected: boolean
  isMultiSelected: boolean
  isHighlighted: boolean
  children: ReactNode
}) {
  return (
    <div
      role="option"
      tabIndex={-1}
      aria-selected={isSelected || isMultiSelected}
      className={surfaceProps.className}
      draggable={surfaceProps.draggable}
      style={surfaceProps.style}
      onClick={surfaceProps.onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') event.currentTarget.click()
      }}
      onContextMenu={surfaceProps.onContextMenu}
      onDragStart={surfaceProps.onDragStart}
      onMouseEnter={surfaceProps.onMouseEnter}
      data-testid={surfaceProps.testId}
      data-highlighted={isHighlighted || undefined}
      data-note-path={entryPath}
      title={surfaceProps.title}
    >
      {children}
    </div>
  )
}

function NoteItemContent(options: {
  entry: VaultEntry
  isBinary: boolean
  isUnavailableBinary: boolean
  isSelected: boolean
  noteStatus: NoteStatus
  showFilename: boolean
}) {
  const {
    entry,
    isBinary,
    isUnavailableBinary,
    isSelected,
    noteStatus,
    showFilename,
  } = options
  return (
    <StandardNoteContent
      entry={entry}
      isBinary={isBinary}
      isUnavailableBinary={isUnavailableBinary}
      noteStatus={noteStatus}
      isSelected={isSelected}
      showFilename={showFilename}
    />
  )
}

export function NoteItem(options: NoteItemProps) {
  const {
    entry,
    isSelected,
    isMultiSelected = false,
    isHighlighted = false,
    noteStatus = 'clean',
    showFilename = false,
    onClickNote,
    onPrefetch,
    onContextMenu,
  } = options
  const isBinary = entry.fileKind === 'binary'
  const previewKind = filePreviewKind(entry)
  const isUnavailableBinary = isBinary && previewKind === null
  const surfaceProps = resolveNoteItemSurfaceProps({
    entry,
    isUnavailableBinary,
    previewKind,
    isSelected,
    isMultiSelected,
    isHighlighted,
    onClickNote,
    onPrefetch,
    onContextMenu,
  })

  return (
    <NoteItemRow
      surfaceProps={surfaceProps}
      entryPath={entry.path}
      isSelected={isSelected}
      isMultiSelected={isMultiSelected}
      isHighlighted={isHighlighted}
    >
      <NoteItemContent
        entry={entry}
        isBinary={isBinary}
        isUnavailableBinary={isUnavailableBinary}
        isSelected={isSelected}
        noteStatus={noteStatus}
        showFilename={showFilename}
      />
    </NoteItemRow>
  )
}
