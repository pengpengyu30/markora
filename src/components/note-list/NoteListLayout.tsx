import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { BulkActionBar } from '../BulkActionBar'
import { NoteListHeader } from './NoteListHeader'
import type { VaultEntry } from '../../types'
import { translate, type AppLocale } from '../../lib/i18n'
import { EmptyMessage } from './TrashWarningBanner'
import type { useNoteListModel } from './useNoteListModel'

function resolveEmptyText({
  query,
  locale,
}: {
  query: string
  locale: AppLocale
}): string {
  return query ? translate(locale, 'noteList.empty.noMatching') : translate(locale, 'noteList.empty.noNotes')
}

function BottomOverlaySpacer() {
  return <div aria-hidden="true" data-testid="note-list-bottom-overlay-spacer" className="h-14" />
}

const BOTTOM_OVERLAY_COMPONENTS = { Footer: BottomOverlaySpacer }
const NO_EXTRA_COMPONENTS = {}

interface ListViewProps {
  searched: VaultEntry[]
  query: string
  renderItem: (entry: VaultEntry) => React.ReactNode
  virtuosoRef?: React.RefObject<VirtuosoHandle | null>
  locale?: AppLocale
  hasBottomOverlay?: boolean
}

export function ListView(props: ListViewProps) {
  const {
    searched,
    query,
    renderItem,
    virtuosoRef,
    locale = 'en',
    hasBottomOverlay,
  } = props
  const emptyText = resolveEmptyText({
    query,
    locale,
  })

  if (searched.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <EmptyMessage text={emptyText} />
        {hasBottomOverlay && <BottomOverlaySpacer />}
      </div>
    )
  }

  return (
    <Virtuoso
      ref={virtuosoRef}
      style={{ height: '100%' }}
      data={searched}
      overscan={200}
      components={hasBottomOverlay ? BOTTOM_OVERLAY_COMPONENTS : NO_EXTRA_COMPONENTS}
      itemContent={(_index, entry) => renderItem(entry)}
    />
  )
}

type NoteListLayoutProps = ReturnType<typeof useNoteListModel>

const NOTE_LIST_LOADING_ROWS = [
  { id: 'wide', title: 184, line: 254, selected: false },
  { id: 'selected', title: 142, line: 220, selected: true },
  { id: 'short', title: 98, line: 242, selected: false },
  { id: 'long', title: 212, line: 198, selected: false },
]

function NoteListLoadingBar({ width }: { width: number }) {
  return <span aria-hidden="true" className="block h-4 rounded bg-muted" style={{ width }} />
}

function NoteListLoadingRow({ title, line, selected }: { title: number; line: number; selected: boolean }) {
  return (
    <div
      className="border-b border-border"
      style={{
        padding: '12px 12px 10px',
        background: selected ? 'var(--accent-green-light)' : undefined,
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <NoteListLoadingBar width={title} />
        <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded bg-muted" />
      </div>
      <div className="flex flex-col gap-2">
        <NoteListLoadingBar width={line} />
        <NoteListLoadingBar width={Math.round(line * 0.72)} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <NoteListLoadingBar width={44} />
        <NoteListLoadingBar width={82} />
      </div>
    </div>
  )
}

function NoteListLoadingSkeleton() {
  return (
    <div data-testid="note-list-loading-skeleton" className="animate-pulse">
      {NOTE_LIST_LOADING_ROWS.map((row) => (
        <NoteListLoadingRow key={row.id} {...row} />
      ))}
    </div>
  )
}

function MultiSelectBar({
  multiSelect,
  handleBulkDeletePermanently,
}: Pick<
  NoteListLayoutProps,
  | 'multiSelect'
  | 'handleBulkDeletePermanently'
>) {
  if (!multiSelect.isMultiSelecting) return null

  return (
    <BulkActionBar
      count={multiSelect.selectedPaths.size}
      onDelete={handleBulkDeletePermanently}
      onClear={multiSelect.clear}
    />
  )
}

function NoteListContent(
  options: Pick<
    NoteListLayoutProps,
  | 'query'
  | 'renderItem'
  | 'searched'
  | 'noteListVirtuosoRef'
  | 'locale'
  | 'loading'
>,
) {
  const {
    query,
    renderItem,
    searched,
    noteListVirtuosoRef,
    locale,
    loading,
  } = options
  return (
    <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
      {loading ? (
        <NoteListLoadingSkeleton />
      ) : (
        <ListView
          searched={searched}
          query={query}
          renderItem={renderItem}
          virtuosoRef={noteListVirtuosoRef}
          locale={locale}
        />
      )}
    </div>
  )
}

function NoteListBody(
  options: Pick<
    NoteListLayoutProps,
  | 'handleListKeyDown'
  | 'noteListContainerRef'
  | 'handleNoteListBlur'
  | 'handleNoteListFocus'
  | 'focusNoteList'
  | 'noteListVirtuosoRef'
  | 'query'
  | 'renderItem'
  | 'searched'
  | 'locale'
  | 'loading'
  >,
) {
  const {
    handleListKeyDown,
    noteListContainerRef,
    handleNoteListBlur,
    handleNoteListFocus,
    focusNoteList,
    noteListVirtuosoRef,
    query,
    renderItem,
    searched,
    locale,
    loading,
  } = options
  return (
    <div
      ref={noteListContainerRef}
      className="relative flex flex-1 flex-col overflow-hidden outline-none"
      style={{ minHeight: 0 }}
      role="listbox"
      aria-label="Notes"
      tabIndex={0}
      onBlur={handleNoteListBlur}
      onKeyDown={handleListKeyDown}
      onFocus={handleNoteListFocus}
      onClickCapture={focusNoteList}
      data-testid="note-list-container"
    >
      <NoteListContent
        query={query}
        renderItem={renderItem}
        searched={searched}
        noteListVirtuosoRef={noteListVirtuosoRef}
        locale={locale}
        loading={loading}
      />
    </div>
  )
}

function NoteListLayoutHeader(
  options: Pick<
    NoteListLayoutProps,
  | 'title'
  | 'listSort'
  | 'listDirection'
  | 'locale'
  | 'sidebarCollapsed'
  | 'searchVisible'
  | 'search'
  | 'isSearching'
  | 'searchInputRef'
  | 'handleSortChange'
  | 'handleCreateNote'
  | 'toggleSearch'
  | 'setSearch'
  | 'handleSearchKeyDown'
  | 'selectedTags'
  | 'onToggleTag'
  | 'onClearTagFilter'
  >,
) {
  const {
    title,
    listSort,
    listDirection,
    locale,
    sidebarCollapsed,
    searchVisible,
    search,
    isSearching,
    searchInputRef,
    handleSortChange,
    handleCreateNote,
    toggleSearch,
    setSearch,
    handleSearchKeyDown,
    selectedTags,
    onToggleTag,
    onClearTagFilter,
  } = options
  return (
    <NoteListHeader
      title={title}
      listSort={listSort}
      listDirection={listDirection}
      locale={locale}
      sidebarCollapsed={sidebarCollapsed}
      searchVisible={searchVisible}
      search={search}
      isSearching={isSearching}
      searchInputRef={searchInputRef}
      onSortChange={handleSortChange}
      onCreateNote={handleCreateNote}
      onToggleSearch={toggleSearch}
      onSearchChange={setSearch}
      onSearchKeyDown={handleSearchKeyDown}
      selectedTags={selectedTags}
      onToggleTag={onToggleTag}
      onClearTagFilter={onClearTagFilter}
    />
  )
}

function NoteListFooter(
  options: Pick<
  NoteListLayoutProps,
  | 'multiSelect'
  | 'handleBulkDeletePermanently'
  | 'contextMenuNode'
  | 'dialogNode'
  >,
) {
  const {
    multiSelect,
    handleBulkDeletePermanently,
    contextMenuNode,
    dialogNode,
  } = options
  return (
    <>
      <MultiSelectBar
        multiSelect={multiSelect}
        handleBulkDeletePermanently={handleBulkDeletePermanently}
      />
      {contextMenuNode}
      {dialogNode}
    </>
  )
}

export function NoteListLayout({
  noteListPanelRef,
  handleNoteListPanelBlurCapture,
  handleNoteListPanelFocusCapture,
  ...contentProps
}: NoteListLayoutProps) {
  return (
    <div
      ref={noteListPanelRef}
      className="flex flex-col select-none overflow-hidden border-r border-border bg-card text-foreground"
      style={{ height: '100%' }}
      onBlurCapture={handleNoteListPanelBlurCapture}
      onFocusCapture={handleNoteListPanelFocusCapture}
    >
      <NoteListLayoutHeader {...contentProps} />
      <NoteListBody {...contentProps} />
      <NoteListFooter {...contentProps} />
    </div>
  )
}
