import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { useCreateBlockNote } from '@blocknote/react'
import { createTolariaCodeBlockOptions } from './codeBlockOptions'
import { BLOCK_CONTAINER_SELECTOR } from './tolariaBlockNoteDom'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

type CodeBlockLanguageEditor = ReturnType<typeof useCreateBlockNote>

type CodeBlockLanguageTarget = {
  blockId: string
  editable: boolean
  height: number
  language: string
  left: number
  top: number
}

type CodeBlockLanguageBlock = {
  props?: { language?: unknown }
  type?: unknown
}

type LanguageSelectControl = Element & { value: string }

const NATIVE_LANGUAGE_CONTROL_SELECTOR =
  '.bn-block-content[data-content-type="codeBlock"] > div > select'
const CODE_BLOCK_SELECTOR = '.bn-block-content[data-content-type="codeBlock"]'

const LANGUAGE_OPTIONS = Object.entries(
  createTolariaCodeBlockOptions().supportedLanguages ?? {},
).map(([id, language]) => ({ id, name: language.name }))

function liveCodeBlock(editor: CodeBlockLanguageEditor, blockId: string): boolean {
  try {
    return editor.getBlock(blockId)?.type === 'codeBlock'
  } catch {
    return false
  }
}

function blockLanguage(editor: CodeBlockLanguageEditor, blockId: string): string {
  try {
    const block = editor.getBlock(blockId) as CodeBlockLanguageBlock | undefined
    const language = block?.type === 'codeBlock' ? block.props?.language : undefined
    return typeof language === 'string' && language.length > 0 ? language : 'text'
  } catch {
    return 'text'
  }
}

function languageControlTarget(
  editor: CodeBlockLanguageEditor,
  blockId: string,
  codeBlock: HTMLElement,
  nativeControl?: LanguageSelectControl,
): CodeBlockLanguageTarget {
  const rect = (nativeControl ?? codeBlock).getBoundingClientRect()
  const width = 160
  return {
    blockId,
    editable: editor.isEditable
      && codeBlock.closest('.bn-editor')?.getAttribute('contenteditable') !== 'false',
    height: nativeControl ? rect.height : 28,
    language: nativeControl?.value || blockLanguage(editor, blockId),
    left: nativeControl ? rect.left : Math.max(rect.left + 8, rect.right - width - 8),
    top: nativeControl ? rect.top : rect.top + 4,
  }
}

function codeBlockLanguageTargetForId(
  editor: CodeBlockLanguageEditor,
  blockId: string,
): CodeBlockLanguageTarget | null {
  const blockContainer = Array.from(document.querySelectorAll(BLOCK_CONTAINER_SELECTOR))
    .find((element) => element.getAttribute('data-id') === blockId)
  const codeBlock = blockContainer?.querySelector<HTMLElement>(CODE_BLOCK_SELECTOR)
  if (!codeBlock) return null
  const nativeControl = blockContainer?.querySelector<LanguageSelectControl>(NATIVE_LANGUAGE_CONTROL_SELECTOR) ?? undefined
  if (!liveCodeBlock(editor, blockId)) return null
  return languageControlTarget(editor, blockId, codeBlock, nativeControl)
}

function blockIdFromElement(element: Element | null): string | null {
  return element?.closest(CODE_BLOCK_SELECTOR)
    ?.closest(BLOCK_CONTAINER_SELECTOR)
    ?.getAttribute('data-id') ?? null
}

function blockIdFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null
  return blockIdFromElement(target)
}

function languagePickerSurfaceTarget(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null
  return target.closest('.editor__code-block-language-overlay, [data-slot="select-content"]')
}

function sameTarget(
  current: CodeBlockLanguageTarget | null,
  next: CodeBlockLanguageTarget | null,
): boolean {
  if (current === next) return true
  if (!current || !next) return false
  return current.blockId === next.blockId
    && current.editable === next.editable
    && current.height === next.height
    && current.language === next.language
    && current.left === next.left
    && current.top === next.top
}

function useCodeBlockLanguageTargets(editor: CodeBlockLanguageEditor) {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [target, setTarget] = useState<CodeBlockLanguageTarget | null>(null)

  useEffect(() => {
    let refreshFrame: number | null = null
    const refresh = () => {
      if (refreshFrame !== null) return
      refreshFrame = requestAnimationFrame(() => {
        refreshFrame = null
        const nextTarget = activeBlockId === null
          ? null
          : codeBlockLanguageTargetForId(editor, activeBlockId)
        setTarget((current) => sameTarget(current, nextTarget) ? current : nextTarget)
      })
    }
    const handlePointerOver = (event: PointerEvent) => {
      const nextBlockId = blockIdFromTarget(event.target)
      if (nextBlockId) setActiveBlockId(nextBlockId)
    }
    const handlePointerOut = (event: PointerEvent) => {
      const relatedTarget = event.relatedTarget
      if (languagePickerSurfaceTarget(relatedTarget) || blockIdFromTarget(relatedTarget) !== null) return
      if (languagePickerSurfaceTarget(event.target) || blockIdFromTarget(event.target) !== null) {
        setActiveBlockId(null)
      }
    }
    const handleFocusIn = (event: FocusEvent) => {
      const nextBlockId = blockIdFromTarget(event.target)
      if (nextBlockId) setActiveBlockId(nextBlockId)
    }
    const handleFocusOut = (event: FocusEvent) => {
      const relatedTarget = event.relatedTarget
      if (languagePickerSurfaceTarget(relatedTarget) || blockIdFromTarget(relatedTarget) !== null) return
      if (languagePickerSurfaceTarget(event.target) || blockIdFromTarget(event.target) !== null) {
        setActiveBlockId(null)
      }
    }
    const editorStateObserver = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => (
        mutation.target instanceof Element && mutation.target.closest('.bn-editor') !== null
      ))) refresh()
    })
    editorStateObserver.observe(document.body, {
      attributeFilter: ['contenteditable'],
      attributes: true,
      subtree: true,
    })
    document.addEventListener('pointerover', handlePointerOver, true)
    document.addEventListener('pointerout', handlePointerOut, true)
    document.addEventListener('focusin', handleFocusIn, true)
    document.addEventListener('focusout', handleFocusOut, true)
    const unsubscribe = editor.onChange?.(refresh) ?? (() => {})
    window.addEventListener('resize', refresh)
    document.addEventListener('scroll', refresh, true)
    refresh()

    return () => {
      if (refreshFrame !== null) cancelAnimationFrame(refreshFrame)
      editorStateObserver.disconnect()
      document.removeEventListener('pointerover', handlePointerOver, true)
      document.removeEventListener('pointerout', handlePointerOut, true)
      document.removeEventListener('focusin', handleFocusIn, true)
      document.removeEventListener('focusout', handleFocusOut, true)
      unsubscribe()
      window.removeEventListener('resize', refresh)
      document.removeEventListener('scroll', refresh, true)
    }
  }, [activeBlockId, editor])

  return target
}

function updateCodeBlockLanguage(
  editor: CodeBlockLanguageEditor,
  blockId: string,
  language: string,
): void {
  if (!editor.isEditable) return

  try {
    const block = editor.getBlock(blockId)
    if (!block || block.type !== 'codeBlock') return
    editor.updateBlock(blockId, { props: { language } })
  } catch {
    // BlockNote can remove a block between the picker opening and selection.
  }
}

function CodeBlockLanguagePicker({
  blockId,
  editable,
  editor,
  language,
}: {
  blockId: string
  editable: boolean
  editor: CodeBlockLanguageEditor
  language: string
}) {
  return (
    <Select
      disabled={!editable}
      value={language}
      onValueChange={(nextLanguage) => updateCodeBlockLanguage(editor, blockId, nextLanguage)}
    >
      <SelectTrigger
        size="sm"
        className="editor__code-block-language-trigger h-7 max-w-72 border-transparent bg-transparent px-2 py-0 text-xs text-muted-foreground shadow-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-1"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        {LANGUAGE_OPTIONS.map(({ id, name }) => (
          <SelectItem key={id} value={id}>{name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function CodeBlockLanguageControls({ editor }: { editor: CodeBlockLanguageEditor }) {
  const target = useCodeBlockLanguageTargets(editor)
  if (!target) return null

  return createPortal(
    <div
      className="editor__code-block-language-overlay"
      data-code-block-id={target.blockId}
      style={{ left: target.left, minHeight: target.height, top: target.top }}
    >
      <CodeBlockLanguagePicker
        blockId={target.blockId}
        editable={target.editable}
        editor={editor}
        language={target.language}
      />
    </div>,
    document.body,
    target.blockId,
  )
}
