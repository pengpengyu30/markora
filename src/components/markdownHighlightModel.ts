import type { useCreateBlockNote } from '@blocknote/react'
import { dispatchRichEditorExternalChange } from './editorExternalChangeEvents'
import {
  DEFAULT_MARKDOWN_HIGHLIGHT_COLOR,
  markdownHighlightColorFromStyles,
  type MarkdownHighlightColor,
} from '../utils/markdownHighlightMarkdown'
import { selectionOrHighlightRange } from './markdownHighlightRange'

export type HighlightEditor = ReturnType<typeof useCreateBlockNote>
export type HighlightRange = { from: number; to: number }

function validRange(editor: HighlightEditor, range: HighlightRange | null): range is HighlightRange {
  if (!range) return false
  return range.from >= 0
    && range.to > range.from
    && range.to <= editor.prosemirrorState.doc.content.size
}

function updateHighlightMarks(
  editor: HighlightEditor,
  range: HighlightRange,
  color: MarkdownHighlightColor | null,
) {
  const { schema, tr } = editor.prosemirrorState
  const highlightMark = schema.marks.highlight
  const backgroundColorMark = schema.marks.backgroundColor
  if (!highlightMark) return

  let transaction = backgroundColorMark
    ? tr.removeMark(range.from, range.to, backgroundColorMark)
    : tr
  if (color === null) {
    transaction = transaction.removeMark(range.from, range.to, highlightMark)
  } else {
    transaction = transaction.addMark(range.from, range.to, highlightMark.create())
    if (color !== DEFAULT_MARKDOWN_HIGHLIGHT_COLOR && backgroundColorMark) {
      transaction = transaction.addMark(
        range.from,
        range.to,
        backgroundColorMark.create({ stringValue: color }),
      )
    }
  }

  editor.prosemirrorView.dispatch(transaction.scrollIntoView())
  dispatchRichEditorExternalChange(editor, editor.domElement ?? undefined)
  editor.focus()
}

export function applyMarkdownHighlightColor(
  editor: HighlightEditor,
  color: MarkdownHighlightColor,
  range: HighlightRange | null,
) {
  if (!validRange(editor, range)) return
  updateHighlightMarks(editor, range, color)
}

export function toggleDefaultMarkdownHighlight(editor: HighlightEditor) {
  const activeColor = markdownHighlightColorFromStyles(editor.getActiveStyles())
  const range = selectionOrHighlightRange(editor)

  if (validRange(editor, range)) {
    updateHighlightMarks(
      editor,
      range,
      activeColor === null ? DEFAULT_MARKDOWN_HIGHLIGHT_COLOR : null,
    )
    return
  }

  editor.focus()
  editor.removeStyles({ backgroundColor: 'default' } as never)
  editor.toggleStyles({ highlight: true } as never)
}
