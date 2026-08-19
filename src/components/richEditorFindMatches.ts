import type { Node as ProsemirrorNode } from '@tiptap/pm/model'
import {
  findEditorMatches,
  type EditorFindMatch,
  type EditorFindOptions,
} from '../utils/editorFind'

const HIDDEN_NODE_NAMES = new Set([
  'frontmatter',
  'front_matter',
  'yamlFrontmatter',
  'yaml_frontmatter',
])

export interface RichEditorVisibleText {
  text: string
  positions: ReadonlyArray<number | null>
}

export interface RichEditorFindMatch extends EditorFindMatch {
  textFrom: number
  textTo: number
}

export interface RichEditorFindResult {
  error: string | null
  matches: RichEditorFindMatch[]
  visibleText: string
}

const EMPTY_RICH_EDITOR_VISIBLE_TEXT: RichEditorVisibleText = {
  text: '',
  positions: [],
}

function appendText(
  text: string,
  position: number,
  output: string[],
  positions: Array<number | null>,
): void {
  for (let offset = 0; offset < text.length; offset += 1) {
    output.push(text[offset])
    positions.push(position + offset)
  }
}

function appendBlockSeparator(output: string[], positions: Array<number | null>): void {
  if (output.length === 0 || positions.at(-1) === null) return

  output.push('\n')
  positions.push(null)
}

function walkVisibleText(
  node: ProsemirrorNode,
  position: number,
  output: string[],
  positions: Array<number | null>,
): void {
  if (HIDDEN_NODE_NAMES.has(node.type.name)) return

  if (node.isText) {
    if (node.text) appendText(node.text, position, output, positions)
    return
  }

  node.forEach((child, offset) => {
    if (child.isBlock) appendBlockSeparator(output, positions)

    const childPosition = position + offset + (node.type.name === 'doc' ? 0 : 1)
    walkVisibleText(child, childPosition, output, positions)
  })
}

export function extractRichEditorVisibleText(doc: ProsemirrorNode): RichEditorVisibleText {
  const output: string[] = []
  const positions: Array<number | null> = []
  walkVisibleText(doc, 0, output, positions)
  return { text: output.join(''), positions }
}

function mapVisibleTextRange(
  visibleText: RichEditorVisibleText,
  from: number,
  to: number,
): { from: number; to: number } | null {
  if (from < 0 || to <= from || to > visibleText.positions.length) return null

  const start = visibleText.positions[from]
  const end = visibleText.positions[to - 1]
  if (start === null || start === undefined || end === null || end === undefined) return null

  for (let offset = from; offset < to; offset += 1) {
    if (visibleText.positions[offset] === null) return null
  }

  return { from: start, to: end + 1 }
}

export function findRichEditorMatchesInVisibleText(
  visible: RichEditorVisibleText,
  query: string,
  options: EditorFindOptions,
): RichEditorFindResult {
  const result = findEditorMatches(visible.text, query, options)
  const matches: RichEditorFindMatch[] = []

  for (const match of result.matches) {
    const range = mapVisibleTextRange(visible, match.from, match.to)
    if (!range) continue

    matches.push({
      ...match,
      from: range.from,
      textFrom: match.from,
      textTo: match.to,
      to: range.to,
    })
  }

  return {
    error: result.error,
    matches,
    visibleText: visible.text,
  }
}

export function findRichEditorMatches(
  doc: ProsemirrorNode,
  query: string,
  options: EditorFindOptions,
): RichEditorFindResult {
  return findRichEditorMatchesInVisibleText(extractRichEditorVisibleText(doc), query, options)
}

export function emptyRichEditorVisibleText(): RichEditorVisibleText {
  return EMPTY_RICH_EDITOR_VISIBLE_TEXT
}
