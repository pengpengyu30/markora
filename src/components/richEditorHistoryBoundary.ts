import { closeHistory, redoDepth, undoDepth } from '@tiptap/pm/history'
import type { useCreateBlockNote } from '@blocknote/react'
import type { EditorHistoryCommands } from '../utils/appOrchestration'

export function createRichEditorHistoryBoundary(
  editor: ReturnType<typeof useCreateBlockNote>,
  path: string,
): EditorHistoryCommands {
  const view = editor._tiptapEditor.view
  view.dispatch(closeHistory(view.state.tr))

  const boundaryUndoDepth = undoDepth(editor._tiptapEditor.state)
  const boundaryRedoDepth = redoDepth(editor._tiptapEditor.state)

  return {
    path,
    undo: () => {
      const state = editor._tiptapEditor.state
      if (undoDepth(state) <= boundaryUndoDepth) return false
      return editor.undo()
    },
    redo: () => {
      const state = editor._tiptapEditor.state
      if (redoDepth(state) <= boundaryRedoDepth) return false
      return editor.redo()
    },
  }
}
