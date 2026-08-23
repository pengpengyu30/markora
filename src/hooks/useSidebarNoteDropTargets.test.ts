import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSidebarNoteDropTargets } from './useSidebarNoteDropTargets'
import { writeNoteDragData } from '../utils/noteDragDrop'

function dispatchDragEvent(target: HTMLElement, type: string, dataTransfer: DataTransfer): DragEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
  target.dispatchEvent(event)
  return event
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('useSidebarNoteDropTargets', () => {
  it('highlights and handles a valid folder drop even when the browser hides the MIME payload', () => {
    const target = document.createElement('button')
    target.dataset.noteDropFolder = 'projects'
    document.body.append(target)
    const setData = vi.fn()
    const moveNoteToFolder = vi.fn()
    const { unmount } = renderHook(() => useSidebarNoteDropTargets({
      canDropNoteOnType: () => false,
      canDropNoteOnFolder: (notePath, folderPath) => notePath === '/vault/alpha.md' && folderPath === 'projects',
      changeNoteType: vi.fn(),
      moveNoteToFolder,
    }))
    const dataTransfer = { getData: vi.fn(() => ''), setData } as unknown as DataTransfer

    writeNoteDragData(dataTransfer, '/vault/alpha.md')
    const dragOver = dispatchDragEvent(target, 'dragover', dataTransfer)

    expect(dragOver.defaultPrevented).toBe(true)
    expect(target.dataset.noteDropState).toBe('valid')

    dispatchDragEvent(target, 'drop', dataTransfer)

    expect(moveNoteToFolder).toHaveBeenCalledWith('/vault/alpha.md', 'projects')
    expect(target.dataset.noteDropState).toBeUndefined()
    unmount()
  })
})
