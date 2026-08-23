export const NOTE_DRAG_MIME_TYPE = 'application/x-markora-note-path'

let activeDraggedNotePath: string | null = null

export function writeNoteDragData(dataTransfer: DataTransfer, notePath: string) {
  const normalizedNotePath = notePath.trim()
  activeDraggedNotePath = normalizedNotePath || null
  dataTransfer.effectAllowed = 'move'
  dataTransfer.setData(NOTE_DRAG_MIME_TYPE, normalizedNotePath)
  dataTransfer.setData('text/plain', normalizedNotePath)
}

export function clearDraggedNotePath(): void {
  activeDraggedNotePath = null
}

export function readDraggedNotePath(dataTransfer: DataTransfer | null): string | null {
  const rawNotePath = dataTransfer?.getData(NOTE_DRAG_MIME_TYPE)
  const notePath = typeof rawNotePath === 'string' ? rawNotePath.trim() : ''
  return notePath || activeDraggedNotePath
}
