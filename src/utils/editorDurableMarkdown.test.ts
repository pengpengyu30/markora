import { BlockNoteEditor } from '@blocknote/core'
import { describe, expect, it, vi } from 'vitest'
import { schema } from '../components/editorSchema'
import { installBlockNoteDirectMarkdown } from './blockNoteDirectMarkdown'
import {
  injectDurableEditorMarkdownBlocks,
  preProcessDurableEditorMarkdown,
  serializeDurableEditorBlocks,
} from './editorDurableMarkdown'
import { MERMAID_BLOCK_TYPE } from './mermaidMarkdown'
import { TLDRAW_BLOCK_TYPE } from './tldrawMarkdown'

describe('editor durable markdown blocks', () => {
  it('round-trips Mermaid and tldraw blocks through one durable pipeline', () => {
    const markdown = [
      'Intro',
      '',
      '```tldraw id="map" height="640" width="900"',
      '{ "store": {} }',
      '```',
      '',
      '```mermaid',
      'flowchart LR',
      '  A --> B',
      '```',
    ].join('\n')
    const preprocessed = preProcessDurableEditorMarkdown({ markdown })
    const blocks = injectDurableEditorMarkdownBlocks([
      { type: 'paragraph', content: [{ type: 'text', text: 'Intro', styles: {} }], children: [] },
      { type: 'paragraph', content: [{ type: 'text', text: preprocessed.split('\n\n')[1], styles: {} }], children: [] },
      { type: 'paragraph', content: [{ type: 'text', text: preprocessed.split('\n\n')[2], styles: {} }], children: [] },
    ]) as Array<{ type: string; props?: Record<string, string>; content?: Array<{ text?: string }> }>

    expect(blocks.map(block => block.type)).toEqual(['paragraph', TLDRAW_BLOCK_TYPE, MERMAID_BLOCK_TYPE])
    expect(blocks[1].props).toMatchObject({ boardId: 'map', height: '640', snapshot: '{ "store": {} }', width: '900' })
    expect(blocks[2].props).toMatchObject({ diagram: 'flowchart LR\n  A --> B\n' })

    const editor = {
      blocksToMarkdownLossy: vi.fn((ordinaryBlocks: unknown[]) => {
        return (ordinaryBlocks as Array<{ content?: Array<{ text?: string }> }>)
          .map(block => block.content?.map(item => item.text ?? '').join('') ?? '')
          .join('\n\n')
      }),
    }

    expect(serializeDurableEditorBlocks(editor, blocks)).toBe(markdown)
  })

  it('leaves legacy fenced HTML as ordinary Markdown source', async () => {
    const editor = BlockNoteEditor.create({ schema })
    const markdown = [
      '```html',
      '<script>window.__shouldNotRun = true</script>',
      '```',
    ].join('\n')

    const preprocessed = preProcessDurableEditorMarkdown({ markdown })
    expect(preprocessed).toBe(markdown)

    const blocks = await editor.tryParseMarkdownToBlocks(preprocessed)
    expect(blocks[0]).toMatchObject({ type: 'codeBlock' })
    expect(serializeDurableEditorBlocks(editor, blocks)).toBe(markdown)
  })

  it('keeps parsed fenced code literal across rich-editor serialization', async () => {
    const editor = BlockNoteEditor.create({ schema })
    installBlockNoteDirectMarkdown(editor)
    const markdown = [
      '```sql',
      'alter table db_sys.crm_client add client_csm_factor decimal(5, 2) null;',
      'select PATH_WITH_BACKSLASH from container\\_name;',
      '```',
    ].join('\n')

    const blocks = await editor.tryParseMarkdownToBlocks(markdown)

    expect(serializeDurableEditorBlocks(editor, blocks)).toBe(markdown)
  })

  it('restores Mermaid placeholders after Markdown-active diagram text passes through BlockNote', async () => {
    const editor = BlockNoteEditor.create({ schema })
    const markdown = [
      '```mermaid',
      'flowchart TB',
      '  a["events: run.* thread.* and field_value"] --> b["ok"]',
      '```',
    ].join('\n')

    const parsed = await editor.tryParseMarkdownToBlocks(
      preProcessDurableEditorMarkdown({ markdown }),
    )
    const [block] = injectDurableEditorMarkdownBlocks(parsed) as Array<{
      type: string
      props?: Record<string, string>
    }>

    expect(block).toMatchObject({
      type: MERMAID_BLOCK_TYPE,
      props: {
        source: markdown,
        diagram: 'flowchart TB\n  a["events: run.* thread.* and field_value"] --> b["ok"]\n',
      },
    })
  })

  it('restores tldraw placeholders after Markdown-active token text passes through BlockNote', async () => {
    const editor = BlockNoteEditor.create({ schema })
    const markdown = [
      '```tldraw id="day-plan" height="640" width="900"',
      '{ "store": { "shape:focus": { "id": "shape:focus", "type": "geo" } } }',
      '```',
    ].join('\n')

    const parsed = await editor.tryParseMarkdownToBlocks(
      preProcessDurableEditorMarkdown({ markdown }),
    )
    const [block] = injectDurableEditorMarkdownBlocks(parsed) as Array<{
      type: string
      props?: Record<string, string>
    }>

    expect(block).toMatchObject({
      type: TLDRAW_BLOCK_TYPE,
      props: {
        boardId: 'day-plan',
        height: '640',
        snapshot: '{ "store": { "shape:focus": { "id": "shape:focus", "type": "geo" } } }',
        width: '900',
      },
    })
  })

  it('recovers tldraw placeholders after Markdown emphasis strips token separators', () => {
    const markdown = [
      '```tldraw id="day-plan" height="640" width="900"',
      '{ "store": { "shape:focus": { "id": "shape:focus", "type": "geo" } } }',
      '```',
    ].join('\n')
    const emphasisStrippedToken = preProcessDurableEditorMarkdown({ markdown }).replaceAll('_', '')

    const [block] = injectDurableEditorMarkdownBlocks([{
      type: 'paragraph',
      content: [{ type: 'text', text: emphasisStrippedToken, styles: {} }],
      children: [],
    }]) as Array<{
      type: string
      props?: Record<string, string>
    }>

    expect(block).toMatchObject({
      type: TLDRAW_BLOCK_TYPE,
      props: {
        boardId: 'day-plan',
        height: '640',
        snapshot: '{ "store": { "shape:focus": { "id": "shape:focus", "type": "geo" } } }',
        width: '900',
      },
    })
  })

})
