import {
  DEFAULT_MARKDOWN_HIGHLIGHT_COLOR,
  MARKDOWN_HIGHLIGHT_STYLE,
  readMarkdownHighlightPrefix,
  type MarkdownHighlightColor,
} from '../utils/markdownHighlightMarkdown'
import {
  createRichEditorInputTransformExtension,
  type RichEditorInputView,
  type RichEditorInputTransform,
} from './richEditorInputTransform'

const MARKDOWN_HIGHLIGHT_DELIMITER = '=='
const MARKDOWN_HIGHLIGHT_DELIMITER_LENGTH = MARKDOWN_HIGHLIGHT_DELIMITER.length
const FINAL_MARKDOWN_HIGHLIGHT_INPUT = '='
const CODE_BLOCK_NODE_TYPE = 'codeBlock'
const CODE_MARK_TYPE = 'code'

type EditorViewLike = RichEditorInputView
type TextblockParent = EditorViewLike['state']['selection']['$from']['parent']
type MarkLike = { type: { name: string } }
type EditorMark = Parameters<EditorViewLike['state']['tr']['addMark']>[2]
type MarkTypeLike = { create: (attrs?: Record<string, string>) => EditorMark }

interface MarkdownHighlightCursorText {
  beforeText: string
  cursor: number
  parentStart: number
}

export interface MarkdownHighlightInputReplacement {
  closingFrom: number
  closingTo: number
  color: MarkdownHighlightColor
  contentFrom: number
  contentTo: number
  openingFrom: number
  openingTo: number
}

function isInsertedFinalEquals(event: InputEvent): event is InputEvent & { data: string } {
  return event.inputType === 'insertText'
    && event.data === FINAL_MARKDOWN_HIGHLIGHT_INPUT
}

function hasCodeMark(marks: readonly MarkLike[] | null | undefined): boolean {
  return Boolean(marks?.some((mark) => mark.type.name === CODE_MARK_TYPE))
}

function selectionHasCodeMark(view: EditorViewLike): boolean {
  const marks = view.state.storedMarks ?? view.state.selection.$from.marks()
  return hasCodeMark(marks)
}

function rangeHasCodeMark(
  view: EditorViewLike,
  from: number,
  to: number,
): boolean {
  let containsCode = false

  view.state.doc.nodesBetween(from, to, (node: {
    isText?: boolean
    marks?: readonly MarkLike[]
  }) => {
    if (!node.isText) return true

    containsCode = hasCodeMark(node.marks)
    return !containsCode
  })

  return containsCode
}

function isCodeBlockTextblock(parent: TextblockParent): boolean {
  const type = Reflect.get(parent, 'type') as unknown
  return typeof type === 'object'
    && type !== null
    && Reflect.get(type, 'name') === CODE_BLOCK_NODE_TYPE
}

function readCursorText(view: EditorViewLike): MarkdownHighlightCursorText | null {
  const { from, to, $from } = view.state.selection
  if (from !== to) return null
  if (!$from.parent.isTextblock) return null
  if (isCodeBlockTextblock($from.parent)) return null

  return {
    beforeText: $from.parent.textBetween(0, $from.parentOffset, '', ''),
    cursor: from,
    parentStart: from - $from.parentOffset,
  }
}

function hasValidHighlightContent(content: string): boolean {
  if (content.trim().length === 0) return false
  if (/^\s|\s$/.test(content)) return false
  return !/[\r\n]/.test(content)
}

export function readMarkdownHighlightInputReplacement({
  beforeText,
  cursor,
  parentStart,
}: MarkdownHighlightCursorText): MarkdownHighlightInputReplacement | null {
  const candidateText = `${beforeText}${FINAL_MARKDOWN_HIGHLIGHT_INPUT}`
  if (!candidateText.endsWith(MARKDOWN_HIGHLIGHT_DELIMITER)) return null

  const closingStart = candidateText.length - MARKDOWN_HIGHLIGHT_DELIMITER_LENGTH
  const openingStart = candidateText.lastIndexOf(
    MARKDOWN_HIGHLIGHT_DELIMITER,
    closingStart - 1,
  )
  if (openingStart === -1) return null

  const unprefixedContentStart = openingStart + MARKDOWN_HIGHLIGHT_DELIMITER_LENGTH
  const candidateContent = candidateText.slice(unprefixedContentStart, closingStart)
  const prefixed = readMarkdownHighlightPrefix(candidateContent)
  const contentStart = unprefixedContentStart + candidateContent.length - prefixed.text.length
  if (!hasValidHighlightContent(prefixed.text)) return null

  const closingFrom = parentStart + closingStart
  if (cursor !== closingFrom + 1) return null

  return {
    closingFrom,
    closingTo: cursor,
    color: prefixed.color,
    contentFrom: parentStart + contentStart,
    contentTo: parentStart + closingStart,
    openingFrom: parentStart + openingStart,
    openingTo: parentStart + contentStart,
  }
}

function readMarkType(view: EditorViewLike, name: string): MarkTypeLike | null {
  const markType = Reflect.get(view.state.schema.marks, name) as MarkTypeLike | undefined
  return markType ?? null
}

function replaceCompletedMarkdownHighlight(
  view: EditorViewLike,
): EditorViewLike['state']['tr'] | null {
  if (selectionHasCodeMark(view)) return null

  const cursorText = readCursorText(view)
  if (!cursorText) return null

  const replacement = readMarkdownHighlightInputReplacement(cursorText)
  const highlightMarkType = readMarkType(view, MARKDOWN_HIGHLIGHT_STYLE)
  if (!replacement || !highlightMarkType) return null
  if (rangeHasCodeMark(view, replacement.contentFrom, replacement.contentTo)) return null

  const openingLength = replacement.openingTo - replacement.openingFrom
  const highlightedFrom = replacement.contentFrom - openingLength
  const highlightedTo = replacement.contentTo - openingLength

  const transaction = view.state.tr
    .delete(replacement.closingFrom, replacement.closingTo)
    .delete(replacement.openingFrom, replacement.openingTo)
    .addMark(highlightedFrom, highlightedTo, highlightMarkType.create())

  if (replacement.color !== DEFAULT_MARKDOWN_HIGHLIGHT_COLOR) {
    const backgroundColorMarkType = readMarkType(view, 'backgroundColor')
    if (!backgroundColorMarkType) return null
    transaction.addMark(
      highlightedFrom,
      highlightedTo,
      backgroundColorMarkType.create({ stringValue: replacement.color }),
    )
  }

  return transaction.scrollIntoView()
}

export function createMarkdownHighlightInputTransform(): RichEditorInputTransform {
  return {
    handleBeforeInput(event, { view }) {
      if (!isInsertedFinalEquals(event)) return null

      const transaction = replaceCompletedMarkdownHighlight(view)
      if (!transaction) return null

      return { preventDefault: true, transaction }
    },
  }
}

export const createMarkdownHighlightInputExtension = createRichEditorInputTransformExtension({
  createTransforms: () => [createMarkdownHighlightInputTransform()],
  key: 'markdownHighlightInput',
})
