import { useState, useMemo, useCallback, useEffect } from 'react'
import type { VaultEntry, SidebarSelection, ModifiedFile, NoteStatus } from '../../types'
import type { ImmediateCreateOptions } from '../../hooks/useNoteCreation'
import {
  type SortOption,
  type SortDirection,
  type SortConfig,
  getSortComparator,
  filterEntries,
  loadSortPreferences,
  saveSortPreferences,
} from '../../utils/noteListHelpers'
import {
  buildChangesEntries,
  filterByQuery,
  createNoteStatusResolver,
  isDeletedNoteEntry,
  isModifiedEntry,
  routeNoteClick,
} from './noteListUtils'
import type { DeletedNoteEntry } from './noteListUtils'
import { useMultiSelect, type MultiSelectState } from '../../hooks/useMultiSelect'
import { useNoteListKeyboard } from '../../hooks/useNoteListKeyboard'
import { prefetchNoteContent } from '../../hooks/useTabManagement'
import type { AllNotesFileVisibility } from '../../utils/allNotesFileVisibility'

// --- useFilteredEntries ---

interface FilteredEntriesParams {
  entries: VaultEntry[]
  selection: SidebarSelection
  modifiedPathSet: Set<string>
  modifiedSuffixes: string[]
  modifiedFiles?: ModifiedFile[]
  allNotesFileVisibility?: AllNotesFileVisibility
}

function buildFilteredEntries(
  options: FilteredEntriesParams & {
    isChangesView: boolean
  },
) {
  const { entries, selection, isChangesView, modifiedPathSet, modifiedSuffixes, modifiedFiles, allNotesFileVisibility } = options
  let changesEntries: VaultEntry[] | undefined
  if (isChangesView) {
    if (modifiedFiles) return buildChangesEntries(entries, modifiedFiles)
    changesEntries = entries.filter((entry) => isModifiedEntry(entry.path, modifiedPathSet, modifiedSuffixes))
  }

  if (changesEntries) return changesEntries
  return filterEntries(entries, selection, { allNotesFileVisibility })
}

export function useFilteredEntries(options: FilteredEntriesParams) {
  const { entries, selection, modifiedPathSet, modifiedSuffixes, modifiedFiles, allNotesFileVisibility } = options
  const isChangesView = selection.kind === 'filter' && selection.filter === 'changes'
  return useMemo(() => {
    return buildFilteredEntries({
      entries,
      selection,
      isChangesView,
      modifiedPathSet,
      modifiedSuffixes,
      modifiedFiles,
      allNotesFileVisibility,
    })
  }, [
    allNotesFileVisibility,
    entries,
    isChangesView,
    modifiedFiles,
    modifiedPathSet,
    modifiedSuffixes,
    selection,
  ])
}

// --- useNoteListData ---

interface NoteListDataParams {
  entries: VaultEntry[]
  selection: SidebarSelection
  query: string
  listSort: SortOption
  listDirection: SortDirection
  modifiedPathSet: Set<string>
  modifiedSuffixes: string[]
  modifiedFiles?: ModifiedFile[]
  allNotesFileVisibility?: AllNotesFileVisibility
}

export function useNoteListData(options: NoteListDataParams) {
  const { entries, selection, query, listSort, listDirection, modifiedPathSet, modifiedSuffixes, modifiedFiles, allNotesFileVisibility } = options

  const filteredEntries = useFilteredEntries({
    entries,
    selection,
    modifiedPathSet,
    modifiedSuffixes,
    modifiedFiles,
    allNotesFileVisibility,
  })

  const searched = useMemo(() => {
    const sorted = [...filteredEntries].sort(getSortComparator(listSort, listDirection))
    return filterByQuery(sorted, query)
  }, [filteredEntries, listSort, listDirection, query])

  return { searched }
}

// --- useNoteListSearch ---

export function useNoteListSearch() {
  const [search, setSearch] = useState('')
  const [searchVisible, setSearchVisible] = useState(false)
  const query = search.trim().toLowerCase()

  const toggleSearch = useCallback(() => {
    setSearchVisible((v) => {
      if (v) setSearch('')
      return !v
    })
  }, [])

  return { search, setSearch, query, searchVisible, toggleSearch }
}

// --- useNoteListSort ---

const DEFAULT_LIST_CONFIG: SortConfig = {
  option: 'modified',
  direction: 'desc',
}

function saveGroupSort(
  groupLabel: string,
  option: SortOption,
  direction: SortDirection,
  setSortPrefs: React.Dispatch<React.SetStateAction<Record<string, SortConfig>>>,
) {
  setSortPrefs((prev) => {
    const next = { ...prev, [groupLabel]: { option, direction } }
    saveSortPreferences(next)
    return next
  })
}

export function useNoteListSort() {
  const [sortPrefs, setSortPrefs] = useState<Record<string, SortConfig>>(loadSortPreferences)
  const listConfig = sortPrefs.__list__ ?? DEFAULT_LIST_CONFIG

  const handleSortChange = useCallback(
    (groupLabel: string, option: SortOption, direction: SortDirection) => {
    saveGroupSort(groupLabel, option, direction, setSortPrefs)
    },
    [],
  )

  const listSort = listConfig.option
  const listDirection = listConfig.direction

  return {
    listSort,
    listDirection,
    handleSortChange,
    sortPrefs,
  }
}

// --- useMultiSelectKeyboard ---

function isInputHtmlElementFocused(): boolean {
  const activeHTMLElement = document.activeElement
  if (!(activeHTMLElement instanceof HTMLElement)) return false

  return (
    activeHTMLElement.tagName === 'INPUT' ||
    activeHTMLElement.tagName === 'TEXTAREA' ||
    activeHTMLElement.isContentEditable
  )
}

function handleEscapeKey(e: KeyboardEvent, multiSelect: MultiSelectState) {
  if (e.key !== 'Escape' || !multiSelect.isMultiSelecting) return
  e.preventDefault()
  multiSelect.clear()
}

function handleSelectAllKey(e: KeyboardEvent, multiSelect: MultiSelectState) {
  if (e.key !== 'a' || !(e.metaKey || e.ctrlKey) || isInputHtmlElementFocused()) return
  e.preventDefault()
  multiSelect.selectAll()
}

function handleBulkActionKey(e: KeyboardEvent, multiSelect: MultiSelectState, onDelete: () => void) {
  if (!multiSelect.isMultiSelecting || !(e.metaKey || e.ctrlKey)) return
  if (e.key === 'Backspace' || e.key === 'Delete') {
    e.preventDefault()
    e.stopPropagation()
    onDelete()
  }
}

export function useMultiSelectKeyboard(
  multiSelect: MultiSelectState,
  onBulkDelete: () => void,
) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      handleEscapeKey(e, multiSelect)
      handleSelectAllKey(e, multiSelect)
      handleBulkActionKey(e, multiSelect, onBulkDelete)
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [multiSelect, onBulkDelete])
}

// --- useModifiedFilesState ---

export function useModifiedFilesState(
  modifiedFiles: ModifiedFile[] | undefined,
  getNoteStatus: ((path: string) => NoteStatus) | undefined,
) {
  const modifiedPathSet = useMemo(() => new Set((modifiedFiles ?? []).map((f) => f.path)), [modifiedFiles])
  const modifiedSuffixes = useMemo(() => (modifiedFiles ?? []).map((f) => `/${f.relativePath}`), [modifiedFiles])
  const resolvedGetNoteStatus = useMemo<(path: string) => NoteStatus>(
    () => createNoteStatusResolver(getNoteStatus, modifiedFiles, modifiedPathSet),
    [getNoteStatus, modifiedFiles, modifiedPathSet],
  )
  return { modifiedPathSet, modifiedSuffixes, resolvedGetNoteStatus }
}

// --- useChangeStatusResolver ---

function buildChangeStatusMap(isChangesView: boolean, modifiedFiles?: ModifiedFile[]) {
  if (!isChangesView || !modifiedFiles) return undefined

  const map = new Map<string, ModifiedFile['status']>()
  for (const file of modifiedFiles) {
    map.set(file.path, file.status)
    map.set(`/${file.relativePath}`, file.status)
  }

  return map
}

function resolveChangeStatus(path: string, changeStatusMap?: Map<string, ModifiedFile['status']>) {
  if (!changeStatusMap) return undefined

  const direct = changeStatusMap.get(path)
  if (direct) return direct

  const filename = path.split('/').slice(-1)[0]
  for (const [key, status] of changeStatusMap) {
    if (path.endsWith(key) || key.endsWith(filename)) return status
  }

  return undefined
}

export function useChangeStatusResolver(isChangesView: boolean, modifiedFiles?: ModifiedFile[]) {
  const changeStatusMap = useMemo(
    () => buildChangeStatusMap(isChangesView, modifiedFiles),
    [isChangesView, modifiedFiles],
  )

  return useCallback((path: string) => resolveChangeStatus(path, changeStatusMap), [changeStatusMap])
}

// --- useVisibleNotesSync ---

interface VisibleNotesSyncParams {
  visibleNotesRef?: React.MutableRefObject<VaultEntry[]>
  searched: VaultEntry[]
}

export function useVisibleNotesSync({
  visibleNotesRef,
  searched,
}: VisibleNotesSyncParams) {
  useEffect(() => {
    if (!visibleNotesRef) return

    visibleNotesRef.current = searched.filter((entry) => !isDeletedNoteEntry(entry))
  }, [visibleNotesRef, searched])
}

// --- useNoteListInteractions ---

function canPrefetchEntryContent(entry: VaultEntry): boolean {
  return !isDeletedNoteEntry(entry) && entry.fileKind !== 'binary'
}

interface UseNoteListInteractionsParams {
  searched: VaultEntry[]
  selectedNotePath: string | null
  selection: SidebarSelection
  isChangesView: boolean
  searchVisible: boolean
  toggleSearch: () => void
  onReplaceActiveTab: (entry: VaultEntry) => void
  onOpenDeletedNote?: (entry: DeletedNoteEntry) => void
  onOpenInNewWindow?: (entry: VaultEntry) => void
  onAutoTriggerDiff?: () => void
  onDiscardFile?: (relativePath: string) => Promise<void>
  openContextMenuForEntry: (entry: VaultEntry, point: { x: number; y: number }) => void
  onCreateNote: (options?: ImmediateCreateOptions) => void
}

function createNoteRequestForSelection(selection: SidebarSelection): ImmediateCreateOptions | undefined {
  if (selection.kind === 'folder') {
    return {
      creationPath: 'folder_header',
      folderPath: selection.path,
      vaultPath: selection.rootPath,
    }
  }
  return undefined
}

function createNoteForSelection(
  onCreateNote: (options?: ImmediateCreateOptions) => void,
  selection: SidebarSelection,
): void {
  onCreateNote(createNoteRequestForSelection(selection))
}

function resolveChangesContextMenuEntry(
  event: React.KeyboardEvent<HTMLDivElement>,
  isChangesView: boolean,
  onDiscardFile: ((relativePath: string) => Promise<void>) | undefined,
  highlightedPath: string | null,
  searched: VaultEntry[],
) {
  if (!isChangesView || !onDiscardFile || !event.shiftKey || event.key !== 'F10' || !highlightedPath) return null
  return searched.find((candidate) => candidate.path === highlightedPath) ?? null
}

function openHighlightedChangesContextMenu(
  entry: VaultEntry,
  openContextMenuForEntry: (entry: VaultEntry, point: { x: number; y: number }) => void,
) {
  const row = document.querySelector<HTMLElement>(`[data-note-path="${entry.path}"]`)
  const rect = row?.getBoundingClientRect()
  openContextMenuForEntry(entry, {
    x: rect ? rect.left + 24 : 160,
    y: rect ? rect.bottom - 8 : 160,
  })
}

function useKeyboardInteractionState(
  options: Pick<
  UseNoteListInteractionsParams,
  | 'searched'
  | 'selectedNotePath'
  | 'searchVisible'
  | 'toggleSearch'
  | 'onReplaceActiveTab'
  | 'onOpenDeletedNote'
  >,
) {
  const { searched, selectedNotePath, searchVisible, toggleSearch, onReplaceActiveTab, onOpenDeletedNote } = options
  const keyboardEntries = searched

  const handleKeyboardOpen = useCallback(
    (entry: VaultEntry) => {
    if (isDeletedNoteEntry(entry)) {
      onOpenDeletedNote?.(entry)
      return
    }
    onReplaceActiveTab(entry)
    },
    [onOpenDeletedNote, onReplaceActiveTab],
  )

  const handleKeyboardPrefetch = useCallback((entry: VaultEntry) => {
    if (canPrefetchEntryContent(entry)) prefetchNoteContent(entry)
  }, [])

  const noteListKeyboard = useNoteListKeyboard({
    items: keyboardEntries,
    selectedNotePath,
    onOpen: handleKeyboardOpen,
    onPrefetch: handleKeyboardPrefetch,
    searchVisible,
    toggleSearch,
    enabled: true,
  })
  const multiSelect = useMultiSelect(keyboardEntries, selectedNotePath)

  return { multiSelect, noteListKeyboard }
}

function useNoteClickHandler({
  isChangesView,
  onReplaceActiveTab,
  onOpenDeletedNote,
  onOpenInNewWindow,
  onAutoTriggerDiff,
  multiSelect,
}: {
  isChangesView: boolean
  onReplaceActiveTab: (entry: VaultEntry) => void
  onOpenDeletedNote?: (entry: DeletedNoteEntry) => void
  onOpenInNewWindow?: (entry: VaultEntry) => void
  onAutoTriggerDiff?: () => void
  multiSelect: MultiSelectState
}) {
  return useCallback(
    (entry: VaultEntry, event: React.MouseEvent) => {
    if (isDeletedNoteEntry(entry)) {
      routeNoteClick(entry, event, {
        onReplace: () => onOpenDeletedNote?.(entry),
        multiSelect,
      })
      return
    }

    routeNoteClick(entry, event, {
      onReplace: onReplaceActiveTab,
      onOpenInNewWindow,
      multiSelect,
    })

    if (isChangesView && onAutoTriggerDiff) {
      setTimeout(onAutoTriggerDiff, 50)
    }
    },
    [
    isChangesView,
    multiSelect,
    onAutoTriggerDiff,
    onOpenDeletedNote,
    onOpenInNewWindow,
    onReplaceActiveTab,
    ],
  )
}

function useListKeyDownHandler({
  isChangesView,
  onDiscardFile,
  highlightedPath,
  searched,
  openContextMenuForEntry,
  handleKeyDown,
}: {
  isChangesView: boolean
  onDiscardFile?: (relativePath: string) => Promise<void>
  highlightedPath: string | null
  searched: VaultEntry[]
  openContextMenuForEntry: (entry: VaultEntry, point: { x: number; y: number }) => void
  handleKeyDown: (event: React.KeyboardEvent) => void
}) {
  return useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const entry = resolveChangesContextMenuEntry(event, isChangesView, onDiscardFile, highlightedPath, searched)
    if (entry) {
      event.preventDefault()
      event.stopPropagation()
      openHighlightedChangesContextMenu(entry, openContextMenuForEntry)
      return
    }

    handleKeyDown(event)
    },
    [handleKeyDown, highlightedPath, isChangesView, onDiscardFile, openContextMenuForEntry, searched],
  )
}

export function useNoteListInteractions(options: UseNoteListInteractionsParams) {
  const { searched, selectedNotePath, selection, isChangesView, searchVisible, toggleSearch, onReplaceActiveTab, onOpenDeletedNote, onOpenInNewWindow, onAutoTriggerDiff, onDiscardFile, openContextMenuForEntry, onCreateNote } = options
  const { multiSelect, noteListKeyboard } = useKeyboardInteractionState({
    searched,
    selectedNotePath,
    searchVisible,
    toggleSearch,
    onReplaceActiveTab,
    onOpenDeletedNote,
  })

  useEffect(() => {
    void selection
    multiSelect.clear()
  }, [multiSelect.clear, selection]) // eslint-disable-line react-hooks/exhaustive-deps -- clear only when selection changes

  const handleClickNote = useNoteClickHandler({
    isChangesView,
    onReplaceActiveTab,
    onOpenDeletedNote,
    onOpenInNewWindow,
    onAutoTriggerDiff,
    multiSelect,
  })

  const handleListKeyDown = useListKeyDownHandler({
    isChangesView,
    onDiscardFile,
    highlightedPath: noteListKeyboard.highlightedPath,
    searched,
    openContextMenuForEntry,
    handleKeyDown: noteListKeyboard.handleKeyDown,
  })

  const handleCreateNote = useCallback(() => {
    createNoteForSelection(onCreateNote, selection)
  }, [onCreateNote, selection])

  return {
    handleClickNote,
    handleCreateNote,
    handleListKeyDown,
    multiSelect,
    noteListKeyboard,
  }
}
