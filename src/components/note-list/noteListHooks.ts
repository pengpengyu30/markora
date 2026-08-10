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
  filterByQuery,
  createNoteStatusResolver,
  isDeletedNoteEntry,
  routeNoteClick,
} from './noteListUtils'
import { useMultiSelect, type MultiSelectState } from '../../hooks/useMultiSelect'
import { useNoteListKeyboard } from '../../hooks/useNoteListKeyboard'
import { prefetchNoteContent } from '../../hooks/useTabManagement'
import type { AllNotesFileVisibility } from '../../utils/allNotesFileVisibility'

// --- useFilteredEntries ---

interface FilteredEntriesParams {
  entries: VaultEntry[]
  selection: SidebarSelection
  allNotesFileVisibility?: AllNotesFileVisibility
}

function buildFilteredEntries(options: FilteredEntriesParams) {
  const { entries, selection, allNotesFileVisibility } = options
  return filterEntries(entries, selection, { allNotesFileVisibility })
}

export function useFilteredEntries(options: FilteredEntriesParams) {
  const { entries, selection, allNotesFileVisibility } = options
  return useMemo(() => {
    return buildFilteredEntries({
      entries,
      selection,
      allNotesFileVisibility,
    })
  }, [allNotesFileVisibility, entries, selection])
}

// --- useNoteListData ---

interface NoteListDataParams {
  entries: VaultEntry[]
  selection: SidebarSelection
  query: string
  listSort: SortOption
  listDirection: SortDirection
  allNotesFileVisibility?: AllNotesFileVisibility
}

export function useNoteListData(options: NoteListDataParams) {
  const { entries, selection, query, listSort, listDirection, allNotesFileVisibility } = options

  const filteredEntries = useFilteredEntries({
    entries,
    selection,
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
  searchVisible: boolean
  toggleSearch: () => void
  onReplaceActiveTab: (entry: VaultEntry) => void
  onOpenInNewWindow?: (entry: VaultEntry) => void
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

function useKeyboardInteractionState(
  options: Pick<
  UseNoteListInteractionsParams,
  | 'searched'
  | 'selectedNotePath'
  | 'searchVisible'
  | 'toggleSearch'
  | 'onReplaceActiveTab'
  >,
) {
  const { searched, selectedNotePath, searchVisible, toggleSearch, onReplaceActiveTab } = options
  const keyboardEntries = searched

  const handleKeyboardOpen = useCallback(
    (entry: VaultEntry) => {
    onReplaceActiveTab(entry)
    },
    [onReplaceActiveTab],
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
  onReplaceActiveTab,
  onOpenInNewWindow,
  multiSelect,
}: {
  onReplaceActiveTab: (entry: VaultEntry) => void
  onOpenInNewWindow?: (entry: VaultEntry) => void
  multiSelect: MultiSelectState
}) {
  return useCallback(
    (entry: VaultEntry, event: React.MouseEvent) => {
    routeNoteClick(entry, event, {
      onReplace: onReplaceActiveTab,
      onOpenInNewWindow,
      multiSelect,
    })

    },
    [
    multiSelect,
    onOpenInNewWindow,
    onReplaceActiveTab,
    ],
  )
}

function useListKeyDownHandler({
  handleKeyDown,
}: {
  handleKeyDown: (event: React.KeyboardEvent) => void
}) {
  return useCallback((event: React.KeyboardEvent<HTMLDivElement>) => handleKeyDown(event), [handleKeyDown])
}

export function useNoteListInteractions(options: UseNoteListInteractionsParams) {
  const { searched, selectedNotePath, selection, searchVisible, toggleSearch, onReplaceActiveTab, onOpenInNewWindow, onCreateNote } = options
  const { multiSelect, noteListKeyboard } = useKeyboardInteractionState({
    searched,
    selectedNotePath,
    searchVisible,
    toggleSearch,
    onReplaceActiveTab,
  })

  useEffect(() => {
    void selection
    multiSelect.clear()
  }, [multiSelect.clear, selection]) // eslint-disable-line react-hooks/exhaustive-deps -- clear only when selection changes

  const handleClickNote = useNoteClickHandler({
    onReplaceActiveTab,
    onOpenInNewWindow,
    multiSelect,
  })

  const handleListKeyDown = useListKeyDownHandler({
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
