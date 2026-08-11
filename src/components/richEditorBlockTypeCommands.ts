import {
  RICH_EDITOR_BLOCK_TYPE_DEFINITIONS,
  type RichEditorBlockTypeDefinition,
  type RichEditorBlockTypeKey,
} from '../utils/richEditorBlockTypes'

export type RichEditorBlockTypeCommandSource = 'block_menu' | 'command_palette' | 'keyboard_shortcut'

type RichEditorBlock = {
  id: string
  props?: Record<string, unknown>
  type: string
}

type RichEditorBlockTypeUpdate = {
  props?: never
  type: never
}

export type RichEditorBlockTypeCommandEditor = {
  focus?: () => void
  getBlock?: (id: string) => RichEditorBlock | undefined
  getTextCursorPosition?: () => { block?: RichEditorBlock | null }
  transact?: (callback: () => void) => void
  updateBlock: (blockId: string, update: RichEditorBlockTypeUpdate) => unknown
}

function findBlockTypeDefinition(key: RichEditorBlockTypeKey): RichEditorBlockTypeDefinition {
  const definition = RICH_EDITOR_BLOCK_TYPE_DEFINITIONS.find((blockType) => blockType.key === key)
  if (!definition) throw new Error(`Missing rich editor block type definition: ${key}`)
  return definition
}

const CHECKLIST_BLOCK_TYPE = findBlockTypeDefinition('checklist')
const PARAGRAPH_BLOCK_TYPE = findBlockTypeDefinition('paragraph')

function resolveCurrentBlock(editor: RichEditorBlockTypeCommandEditor): RichEditorBlock | null {
  try {
    const cursorBlock = editor.getTextCursorPosition?.().block
    if (!cursorBlock?.id) return null

    return editor.getBlock?.(cursorBlock.id) ?? cursorBlock
  } catch {
    return null
  }
}

function applyBlockTypeUpdate(
  editor: RichEditorBlockTypeCommandEditor,
  block: RichEditorBlock,
  target: RichEditorBlockTypeDefinition,
): boolean {
  const update = {
    type: target.type as never,
    props: target.props as never,
  }
  const runUpdate = () => {
    editor.updateBlock(block.id, update)
  }

  editor.focus?.()
  if (editor.transact) {
    editor.transact(runUpdate)
  } else {
    runUpdate()
  }
  return true
}

function applyResolvedBlockTypeUpdate(
  editor: RichEditorBlockTypeCommandEditor,
  block: RichEditorBlock | null | undefined,
  target: RichEditorBlockTypeDefinition,
): boolean {
  if (!block) return false

  return applyBlockTypeUpdate(editor, block, target)
}

export function turnCurrentBlockIntoType(
  editor: RichEditorBlockTypeCommandEditor,
  target: RichEditorBlockTypeDefinition,
  source: RichEditorBlockTypeCommandSource,
): boolean {
  void source
  return applyResolvedBlockTypeUpdate(editor, resolveCurrentBlock(editor), target)
}

export function toggleCurrentBlockTodoType(
  editor: RichEditorBlockTypeCommandEditor,
  source: RichEditorBlockTypeCommandSource,
): boolean {
  void source
  const block = resolveCurrentBlock(editor)
  if (!block) return false

  const target = block.type === CHECKLIST_BLOCK_TYPE.type
    ? PARAGRAPH_BLOCK_TYPE
    : CHECKLIST_BLOCK_TYPE
  return applyResolvedBlockTypeUpdate(editor, block, target)
}

export function turnBlockIntoType(
  editor: RichEditorBlockTypeCommandEditor,
  blockId: string,
  target: RichEditorBlockTypeDefinition,
  source: RichEditorBlockTypeCommandSource,
): boolean {
  void source
  return applyResolvedBlockTypeUpdate(editor, editor.getBlock?.(blockId), target)
}
