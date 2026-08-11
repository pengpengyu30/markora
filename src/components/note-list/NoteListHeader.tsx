import { useCallback, useEffect, useRef, useState } from 'react'
import { CircleNotch as Loader2, MagnifyingGlass, Plus, SidebarSimple, X } from '@phosphor-icons/react'
import type { SortOption, SortDirection } from '../../utils/noteListHelpers'
import { translate, type AppLocale } from '../../lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { APP_COMMAND_EVENT_NAME, APP_COMMAND_IDS } from '../../hooks/appCommandDispatcher'
import { useDragRegion } from '../../hooks/useDragRegion'
import { SortDropdown } from '../SortDropdown'
import { isMac, MACOS_TRAFFIC_LIGHT_SAFE_PADDING } from '../../utils/platform'

const NOTE_LIST_ACTION_BUTTON_CLASSNAME = '!h-auto !w-auto !min-w-0 !rounded-none !p-0 !text-muted-foreground hover:!bg-transparent hover:!text-foreground focus-visible:!bg-transparent data-[state=open]:!bg-transparent data-[state=open]:!text-foreground [&_svg]:!size-4'
const NOTE_LIST_EXPAND_BUTTON_CLASSNAME = '!h-6 !w-6 !min-w-0 !rounded !p-0 !text-muted-foreground hover:!bg-accent hover:!text-foreground focus-visible:!bg-accent [&_svg]:!size-4'
const NOTE_LIST_SEARCH_DEBOUNCE_MS = 180
interface NoteListHeaderProps {
  title: string
  listSort: SortOption
  listDirection: SortDirection
  sidebarCollapsed?: boolean
  searchVisible: boolean
  search: string
  isSearching: boolean
  searchInputRef: React.RefObject<HTMLInputElement | null>
  locale?: AppLocale
  onSortChange: (groupLabel: string, option: SortOption, direction: SortDirection) => void
  onCreateNote: () => void
  onToggleSearch: () => void
  onSearchChange: (value: string) => void
  onSearchKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  selectedTags?: string[]
  onClearTagFilter?: () => void
}

function dispatchExpandSidebarFromHeader() {
  window.dispatchEvent(new CustomEvent(APP_COMMAND_EVENT_NAME, {
    detail: APP_COMMAND_IDS.viewAll,
  }))
}

function ExpandSidebarButton({ locale }: { locale: AppLocale }) {
  const expandSidebarLabel = translate(locale, 'sidebar.action.expand')

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className={NOTE_LIST_EXPAND_BUTTON_CLASSNAME}
      onClick={dispatchExpandSidebarFromHeader}
      title={expandSidebarLabel}
      aria-label={expandSidebarLabel}
      data-no-drag
    >
      <SidebarSimple size={16} weight="regular" />
    </Button>
  )
}

function HeaderTitle({ title }: Pick<NoteListHeaderProps, 'title'>) {
  return (
    <h3
      className="m-0 min-w-0 flex-1 truncate text-[14px] font-semibold"
    >
      {title}
    </h3>
  )
}

function HeaderLeading({
  title,
  sidebarCollapsed,
  locale,
}: Pick<NoteListHeaderProps, 'title' | 'sidebarCollapsed' | 'locale'> & {
  locale: AppLocale
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      {sidebarCollapsed && <ExpandSidebarButton locale={locale} />}
      <HeaderTitle title={title} />
    </div>
  )
}

function HeaderActions(options: Pick<
  NoteListHeaderProps,
  | 'listSort'
  | 'listDirection'
  | 'locale'
  | 'onSortChange'
  | 'onCreateNote'
  | 'onToggleSearch'
> & {
  locale: AppLocale
}) {
  const {
    listSort,
    listDirection,
    locale,
    onSortChange,
    onCreateNote,
    onToggleSearch,
} = options
  return (
    <div className="ml-3 flex shrink-0 items-center justify-end gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <SortDropdown groupLabel="__list__" current={listSort} direction={listDirection} locale={locale} onChange={onSortChange} />
      <Button type="button" variant="ghost" size="icon-xs" className={NOTE_LIST_ACTION_BUTTON_CLASSNAME} onClick={onToggleSearch} title={translate(locale, 'noteList.searchAction')} aria-label={translate(locale, 'noteList.searchAction')}>
        <MagnifyingGlass size={16} />
      </Button>
      <Button type="button" variant="ghost" size="icon-xs" className={NOTE_LIST_ACTION_BUTTON_CLASSNAME} onClick={onCreateNote} title={translate(locale, 'noteList.createNote')} aria-label={translate(locale, 'noteList.createNote')}>
        <Plus size={16} />
      </Button>
    </div>
  )
}

function SearchRow({ search, isSearching, searchInputRef, locale, onSearchChange, onSearchKeyDown }: Pick<
  NoteListHeaderProps,
  | 'search'
  | 'isSearching'
  | 'searchInputRef'
  | 'locale'
  | 'onSearchChange'
  | 'onSearchKeyDown'
> & {
  locale: AppLocale
}) {
  const [draft, setDraft] = useState(search)
  const debounceRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  const cancelDebounce = useCallback(() => {
    if (debounceRef.current === null) return
    window.clearTimeout(debounceRef.current)
    debounceRef.current = null
  }, [])

  useEffect(() => cancelDebounce, [cancelDebounce])

  const hasSearch = draft.length > 0
  const isDebouncing = draft.trim().toLowerCase() !== search.trim().toLowerCase()
  const clearLabel = translate(locale, 'noteList.clearSearch')

  const handleClearSearch = () => {
    cancelDebounce()
    setDraft('')
    onSearchChange('')
    requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })
  }

  const handleSearchChange = (value: string) => {
    setDraft(value)
    cancelDebounce()

    if (value.trim().length === 0) {
      onSearchChange('')
      return
    }

    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null
      onSearchChange(value)
    }, NOTE_LIST_SEARCH_DEBOUNCE_MS)
  }

  return (
    <div className="border-b border-border px-3 py-2">
      <div className="relative flex-1" aria-live="polite">
        <Input
          ref={searchInputRef}
          placeholder={translate(locale, 'noteList.searchPlaceholder')}
          value={draft}
          onChange={(event) => handleSearchChange(event.target.value)}
          onKeyDown={onSearchKeyDown}
          className="h-8 pr-16 text-[13px]"
        />
        {hasSearch && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute inset-y-1 right-8 !h-6 !w-6 !min-w-0 !rounded !p-0 !text-muted-foreground hover:!bg-accent hover:!text-foreground focus-visible:!bg-accent [&_svg]:!size-3"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleClearSearch}
            title={clearLabel}
            aria-label={clearLabel}
          >
            <X size={12} />
          </Button>
        )}
        {(isDebouncing || isSearching) && (
          <span
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground"
            data-testid="note-list-search-loading"
          >
            <Loader2 size={12} className="animate-spin" />
          </span>
        )}
      </div>
    </div>
  )
}

function TagFilterRow({
  selectedTags,
  locale,
  onClearTagFilter,
}: Pick<NoteListHeaderProps, 'selectedTags' | 'locale' | 'onClearTagFilter'> & { locale: AppLocale }) {
  if (!selectedTags || selectedTags.length === 0) return null

  return (
    <div data-testid="note-list-tag-filter" className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2 text-xs">
      <span className="text-muted-foreground">{translate(locale, 'noteList.tags.filteredBy')}</span>
      {selectedTags.map((tag) => (
        <Badge key={tag} variant="secondary" className="px-1.5 py-0.5 font-normal">{tag}</Badge>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-auto h-6 px-1.5 text-xs font-normal text-muted-foreground hover:text-foreground"
        onClick={onClearTagFilter}
        aria-label={translate(locale, 'noteList.tags.clear')}
      >
        {translate(locale, 'noteList.tags.clear')}
      </Button>
    </div>
  )
}

export function NoteListHeader(options: NoteListHeaderProps) {
  const { title, listSort, listDirection } = options
  const { sidebarCollapsed, searchVisible, search, isSearching, searchInputRef } = options
  const { locale = 'en' } = options
  const { onSortChange, onCreateNote, onToggleSearch, onSearchChange, onSearchKeyDown } = options
  const { dragRegionRef } = useDragRegion<HTMLDivElement>()
  const collapsedSidebarPadding = sidebarCollapsed && isMac()
    ? `var(--tolaria-macos-traffic-light-padding, ${MACOS_TRAFFIC_LIGHT_SAFE_PADDING}px)`
    : undefined

  return (
    <>
      <div ref={dragRegionRef} className="flex h-[52px] shrink-0 items-center justify-between border-b border-border px-4" style={{ cursor: 'default', paddingLeft: collapsedSidebarPadding }}>
        <HeaderLeading
          title={title}
          sidebarCollapsed={sidebarCollapsed}
          locale={locale}
        />
        <HeaderActions
          listSort={listSort}
          listDirection={listDirection}
          locale={locale}
          onSortChange={onSortChange}
          onCreateNote={onCreateNote}
          onToggleSearch={onToggleSearch}
        />
      </div>
      {searchVisible && (
        <SearchRow
          search={search}
          isSearching={isSearching}
          searchInputRef={searchInputRef}
          locale={locale}
          onSearchChange={onSearchChange}
          onSearchKeyDown={onSearchKeyDown}
        />
      )}
      <TagFilterRow selectedTags={options.selectedTags} locale={locale} onClearTagFilter={options.onClearTagFilter} />
    </>
  )
}
