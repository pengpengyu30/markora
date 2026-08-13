import { CaretDown as ChevronDown, CaretUp as ChevronUp, X } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { translate, type AppLocale } from '../lib/i18n'
import {
  applyRichEditorFindState,
  clearRichEditorFind,
  richEditorFindView,
  type RichEditorFindEditor,
} from './richEditorFindExtension'
import { findRichEditorMatches } from './richEditorFindMatches'
import {
  clampEditorFindIndex,
  nextEditorFindIndex,
  type EditorFindOptions,
} from '../utils/editorFind'
import type { RawEditorFindRequest } from './rawEditorFindTypes'

export interface RichEditorFindBarProps {
  editor: RichEditorFindEditor
  locale?: AppLocale
  onClose: () => void
  open: boolean
  path: string
  request?: RawEditorFindRequest | null
}

function matchStatusText(
  locale: AppLocale,
  query: string,
  error: string | null,
  activeIndex: number,
  matchCount: number,
): string {
  if (error === 'Invalid regex') return translate(locale, 'editor.find.invalidRegex')
  if (error) return translate(locale, 'editor.find.regexMustMatchText')
  if (matchCount === 0) {
    const syntaxHint = /[*_~`#[\]()>-]/u.test(query)
      ? ` · ${translate(locale, 'editor.find.rawSyntaxHint')}`
      : ''
    return `${translate(locale, 'editor.find.noMatches')}${syntaxHint}`
  }
  return translate(locale, 'editor.find.matchCount', {
    current: clampEditorFindIndex(activeIndex, matchCount) + 1,
    total: matchCount,
  })
}

function useRequestFocus({
  inputRef,
  open,
  path,
  request,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  open: boolean
  path: string
  request?: RawEditorFindRequest | null
}): void {
  useEffect(() => {
    if (!open || !request || request.path !== path) return

    const frameId = requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => cancelAnimationFrame(frameId)
  }, [inputRef, open, path, request])
}

export function RichEditorFindBar({
  editor,
  locale = 'en',
  onClose,
  open,
  path,
  request,
}: RichEditorFindBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [regex, setRegex] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const options = useMemo<EditorFindOptions>(() => ({ caseSensitive, regex }), [caseSensitive, regex])
  const view = richEditorFindView(editor)
  const result = useMemo(
    () => view
      ? findRichEditorMatches(view.state.doc, query, options)
      : { error: null, matches: [], visibleText: '' },
    [options, query, view],
  )
  const clampedActiveIndex = clampEditorFindIndex(activeIndex, result.matches.length)
  const status = matchStatusText(locale, query, result.error, clampedActiveIndex, result.matches.length)
  const hasMatches = result.matches.length > 0 && !result.error

  useRequestFocus({ inputRef, open, path, request })

  useEffect(() => () => {
    const currentView = richEditorFindView(editor)
    if (currentView) clearRichEditorFind(currentView)
  }, [editor])

  useEffect(() => {
    if (!open) {
      if (view) clearRichEditorFind(view)
      return
    }
    if (!view) return

    applyRichEditorFindState(view, {
      activeIndex: clampedActiveIndex,
      matches: result.matches,
    })
  }, [clampedActiveIndex, open, result.matches, view])

  const moveMatch = useCallback(
    (direction: 1 | -1) => {
      setActiveIndex((current) => nextEditorFindIndex(current, result.matches.length, direction))
    },
    [result.matches.length],
  )

  const close = useCallback(() => {
    const currentView = richEditorFindView(editor)
    if (currentView) clearRichEditorFind(currentView)
    onClose()
    requestAnimationFrame(() => {
      const nextView = richEditorFindView(editor)
      if (nextView && 'focus' in nextView && typeof nextView.focus === 'function') nextView.focus()
    })
  }, [editor, onClose])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Enter') return

      event.preventDefault()
      moveMatch(event.shiftKey ? -1 : 1)
    },
    [close, moveMatch],
  )

  if (!open) return null

  return (
    <div
      className="flex shrink-0 items-center gap-1.5 border-b px-3 py-2"
      data-testid="rich-editor-find-bar"
      style={{
        background: 'var(--surface-editor)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <Input
        ref={inputRef}
        type="search"
        aria-label={translate(locale, 'editor.find.findLabel')}
        placeholder={translate(locale, 'editor.find.findPlaceholder')}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setActiveIndex(0)
        }}
        onKeyDown={handleKeyDown}
        className="h-7 min-w-[12rem] flex-1 rounded px-2 text-xs"
        data-testid="rich-editor-find-input"
      />
      <span
        className="min-w-[4.75rem] text-right text-xs text-muted-foreground"
        aria-live="polite"
        data-testid="rich-editor-find-count"
      >
        {status}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={translate(locale, 'editor.find.previousMatch')}
        title={translate(locale, 'editor.find.previousMatch')}
        disabled={!hasMatches}
        onClick={() => moveMatch(-1)}
      >
        <ChevronUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={translate(locale, 'editor.find.nextMatch')}
        title={translate(locale, 'editor.find.nextMatch')}
        disabled={!hasMatches}
        onClick={() => moveMatch(1)}
      >
        <ChevronDown />
      </Button>
      <Button
        type="button"
        variant={regex ? 'secondary' : 'ghost'}
        size="xs"
        aria-label={translate(locale, 'editor.find.regex')}
        aria-pressed={regex}
        title={translate(locale, 'editor.find.regex')}
        onClick={() => setRegex((value) => !value)}
      >
        .*
      </Button>
      <Button
        type="button"
        variant={caseSensitive ? 'secondary' : 'ghost'}
        size="xs"
        aria-label={translate(locale, 'editor.find.matchCase')}
        aria-pressed={caseSensitive}
        title={translate(locale, 'editor.find.matchCase')}
        onClick={() => setCaseSensitive((value) => !value)}
      >
        Aa
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={translate(locale, 'editor.find.close')}
        title={translate(locale, 'editor.find.close')}
        onClick={close}
      >
        <X />
      </Button>
    </div>
  )
}
