import { describe, expect, it, vi } from 'vitest'
import {
  toggleCurrentBlockTodoType,
  turnBlockIntoType,
  turnCurrentBlockIntoType,
} from './richEditorBlockTypeCommands'
import type { RichEditorBlockTypeDefinition } from '../utils/richEditorBlockTypes'

const headingTwo = {
  key: 'heading-2',
  labelKey: 'editor.blockType.heading2',
  name: 'Heading 2',
  props: { level: 2 },
  type: 'heading',
} satisfies RichEditorBlockTypeDefinition

function createEditor() {
  const block = {
    id: 'paragraph-block',
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text: 'Keep this text', styles: {} }],
    children: [],
  }

  return {
    block,
    editor: {
      focus: vi.fn(),
      getBlock: vi.fn((id: string) => (id === block.id ? block : undefined)),
      getTextCursorPosition: vi.fn(() => ({ block })),
      transact: vi.fn((callback: () => void) => callback()),
      updateBlock: vi.fn(),
    },
  }
}

describe('richEditorBlockTypeCommands', () => {
  it('turns the focused cursor block into the requested type without replacing content', () => {
    const { block, editor } = createEditor()

    const changed = turnCurrentBlockIntoType(editor, headingTwo, 'command_palette')

    expect(changed).toBe(true)
    expect(editor.focus).toHaveBeenCalledOnce()
    expect(editor.transact).toHaveBeenCalledOnce()
    expect(editor.updateBlock).toHaveBeenCalledWith(block.id, {
      type: 'heading',
      props: { level: 2 },
    })
    expect(editor.updateBlock).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      content: expect.anything(),
    }))
  })

  it('re-resolves side-menu blocks before applying the type change', () => {
    const { block, editor } = createEditor()

    const changed = turnBlockIntoType(editor, block.id, headingTwo, 'block_menu')

    expect(changed).toBe(true)
    expect(editor.getBlock).toHaveBeenCalledWith(block.id)
    expect(editor.updateBlock).toHaveBeenCalledWith(block.id, {
      type: 'heading',
      props: { level: 2 },
    })
  })

  it('does nothing when the cursor block is stale or missing', () => {
    const { editor } = createEditor()
    editor.getTextCursorPosition.mockReturnValueOnce({ block: undefined })

    const changed = turnCurrentBlockIntoType(editor, headingTwo, 'command_palette')

    expect(changed).toBe(false)
    expect(editor.updateBlock).not.toHaveBeenCalled()
  })

  it('toggles the focused paragraph block into a checklist block from the keyboard shortcut', () => {
    const { block, editor } = createEditor()

    const changed = toggleCurrentBlockTodoType(editor, 'keyboard_shortcut')

    expect(changed).toBe(true)
    expect(editor.focus).toHaveBeenCalledOnce()
    expect(editor.updateBlock).toHaveBeenCalledWith(block.id, expect.objectContaining({
      type: 'checkListItem',
    }))
    expect(editor.updateBlock).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      content: expect.anything(),
    }))
  })

  it('toggles the focused checklist block back into a paragraph from the keyboard shortcut', () => {
    const { block, editor } = createEditor()
    block.type = 'checkListItem'
    block.props = { checked: true }

    const changed = toggleCurrentBlockTodoType(editor, 'keyboard_shortcut')

    expect(changed).toBe(true)
    expect(editor.updateBlock).toHaveBeenCalledWith(block.id, expect.objectContaining({
      type: 'paragraph',
    }))
  })
})
