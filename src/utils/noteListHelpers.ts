import type { VaultEntry, SidebarSelection } from '../types'
import { APP_STORAGE_KEYS, LEGACY_APP_STORAGE_KEYS, getAppStorageItem } from '../constants/appStorage'
import {
  DEFAULT_ALL_NOTES_FILE_VISIBILITY,
  isOptionalAllNotesFileVisible,
  type AllNotesFileVisibility,
} from './allNotesFileVisibility'
import {
  DEFAULT_DATE_DISPLAY_FORMAT,
  formatTimestampForDateDisplay,
  type DateDisplayFormat,
} from './dateDisplay'

export interface FilterEntriesOptions {
  allNotesFileVisibility?: AllNotesFileVisibility
  folderViewShowNonMarkdown?: boolean
}

export function relativeDate(ts: number | null): string {
  if (!ts) return ''
  const now = Math.floor(Date.now() / 1000)
  const diff = now - ts
  if (diff < 0) {
    const date = new Date(ts * 1000)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  const date = new Date(ts * 1000)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function getDisplayDate(entry: VaultEntry): number | null {
  return entry.modifiedAt ?? entry.createdAt
}

export function formatSubtitle(
  entry: VaultEntry,
  dateDisplayFormat: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT,
): string {
  const parts: string[] = []
  const date = getDisplayDate(entry)
  if (date) parts.push(formatTimestampForDateDisplay(date, dateDisplayFormat))
  if (entry.wordCount > 0) {
    parts.push(`${entry.wordCount.toLocaleString('en-US')} words`)
  } else {
    parts.push('Empty')
  }
  if (entry.outgoingLinks.length > 0) {
    parts.push(`${entry.outgoingLinks.length} ${entry.outgoingLinks.length === 1 ? 'link' : 'links'}`)
  }
  return parts.join(' \u00b7 ')
}

function wasCreatedBeforeLastModification(entry: VaultEntry): boolean {
  return !!(entry.createdAt && entry.modifiedAt && entry.createdAt !== entry.modifiedAt)
}

export function formatSearchSubtitle(
  entry: VaultEntry,
  dateDisplayFormat: DateDisplayFormat = DEFAULT_DATE_DISPLAY_FORMAT,
): string {
  const parts: string[] = []
  const modified = entry.modifiedAt ?? entry.createdAt
  if (modified) parts.push(formatTimestampForDateDisplay(modified, dateDisplayFormat))
  const created = entry.createdAt
  if (created && wasCreatedBeforeLastModification(entry)) {
    parts.push(`Created ${formatTimestampForDateDisplay(created, dateDisplayFormat)}`)
  }
  if (entry.wordCount > 0) {
    parts.push(`${entry.wordCount.toLocaleString('en-US')} words`)
  } else {
    parts.push('Empty')
  }
  if (entry.outgoingLinks.length > 0) {
    parts.push(`${entry.outgoingLinks.length} ${entry.outgoingLinks.length === 1 ? 'link' : 'links'}`)
  }
  return parts.join(' \u00b7 ')
}

export function sortByModified(a: VaultEntry, b: VaultEntry): number {
  return (getDisplayDate(b) ?? 0) - (getDisplayDate(a) ?? 0)
}

export type SortOption = 'modified' | 'created' | 'title'
export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  option: SortOption
  direction: SortDirection
}

export const DEFAULT_SORT_OPTIONS: SortOption[] = ['modified', 'created', 'title']
const BUILT_IN_SORT_OPTIONS = new Set<string>(DEFAULT_SORT_OPTIONS)

export function getDefaultDirection(option: SortOption): SortDirection {
  if (option === 'modified' || option === 'created') return 'desc'
  return 'asc'
}

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'modified', label: 'Modified' },
  { value: 'created', label: 'Created' },
  { value: 'title', label: 'Title' },
]

export function getSortOptionLabel(option: SortOption): string {
  return SORT_OPTIONS.find((o) => o.value === option)?.label ?? option
}

function makeBuiltinComparator(option: string, flip: number): (a: VaultEntry, b: VaultEntry) => number {
  if (option === 'title') return (a, b) => flip * stringField(a.title).localeCompare(stringField(b.title))
  if (option === 'created') return (a, b) => flip * ((a.createdAt ?? a.modifiedAt ?? 0) - (b.createdAt ?? b.modifiedAt ?? 0))
  return (a, b) => flip * ((getDisplayDate(a) ?? 0) - (getDisplayDate(b) ?? 0))
}

export function getSortComparator(option: SortOption, direction?: SortDirection): (a: VaultEntry, b: VaultEntry) => number {
  const flip = (direction ?? getDefaultDirection(option)) === 'asc' ? 1 : -1
  return makeBuiltinComparator(option, flip)
}

/** Serialize a SortConfig to the string format stored in local storage: "option:direction". */
export function serializeSortConfig(config: SortConfig): string {
  return `${config.option}:${config.direction}`
}

/** Parse a legacy sort string ("option:direction") back to a supported SortConfig. */
export function parseSortConfig(raw: string | null | undefined): SortConfig | null {
  if (!raw) return null
  // Format: "option:direction" where option itself can contain ":" (e.g. "property:Priority:asc")
  const lastColon = raw.lastIndexOf(':')
  if (lastColon <= 0) return null
  const dir = raw.slice(lastColon + 1)
  if (dir !== 'asc' && dir !== 'desc') return null
  const optionName = raw.slice(0, lastColon)
  if (optionName === 'property:') return null
  if (optionName === 'status' || !BUILT_IN_SORT_OPTIONS.has(optionName)) return { option: 'modified', direction: dir }
  const option = optionName as SortOption
  return { option, direction: dir }
}

export function loadSortPreferences(): Record<string, SortConfig> {
  try {
    const raw = getAppStorageItem('sortPreferences')
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    const result: Record<string, SortConfig> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') {
        // Migrate old format: bare SortOption string → SortConfig
        const opt = migrateStoredSortOption(value)
        Reflect.set(result, key, { option: opt, direction: getDefaultDirection(opt) })
      } else {
        const config = value as SortConfig
        Reflect.set(result, key, { ...config, option: migrateStoredSortOption(Reflect.get(config, 'option')) })
      }
    }
    return result
  } catch {
    return {}
  }
}

function migrateStoredSortOption(value: unknown): SortOption {
  return typeof value === 'string' && BUILT_IN_SORT_OPTIONS.has(value)
    ? value as SortOption
    : 'modified'
}

export function saveSortPreferences(prefs: Record<string, SortConfig>) {
  try {
    localStorage.setItem(APP_STORAGE_KEYS.sortPreferences, JSON.stringify(prefs))
    localStorage.removeItem(LEGACY_APP_STORAGE_KEYS.sortPreferences)
  } catch { /* ignore */ }
}

/** Remove the `__list__` key from localStorage sort preferences (used during migration). */
export function clearListSortFromLocalStorage(): void {
  try {
    const raw = getAppStorageItem('sortPreferences')
    if (!raw) return
    const parsed = JSON.parse(raw)
    delete parsed.__list__
    if (Object.keys(parsed).length === 0) {
      localStorage.removeItem(APP_STORAGE_KEYS.sortPreferences)
      localStorage.removeItem(LEGACY_APP_STORAGE_KEYS.sortPreferences)
    } else {
      localStorage.setItem(APP_STORAGE_KEYS.sortPreferences, JSON.stringify(parsed))
      localStorage.removeItem(LEGACY_APP_STORAGE_KEYS.sortPreferences)
    }
  } catch { /* ignore */ }
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

const isMarkdown = (e: VaultEntry) => e.fileKind === 'markdown' || !e.fileKind
const ATTACHMENTS_FOLDER = 'attachments'

function isInFolder(entryPath: string, folderRelPath: string): boolean {
  const folderPath = normalizeFolderPath(folderRelPath)
  if (!folderPath) return false
  const normalizedEntryPath = normalizeFolderPath(entryPath)
  return normalizedEntryPath.includes(`/${folderPath}/`) || normalizedEntryPath.startsWith(`${folderPath}/`)
}

function normalizeFolderPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
}

export function isAllNotesEntry(
  entry: VaultEntry,
  allNotesFileVisibility: AllNotesFileVisibility = DEFAULT_ALL_NOTES_FILE_VISIBILITY,
): boolean {
  if (isMarkdown(entry)) return !isInFolder(entry.path, ATTACHMENTS_FOLDER)
  return isOptionalAllNotesFileVisible(entry, allNotesFileVisibility)
}

function isDirectRootEntry(entryPath: string, rootPath?: string): boolean {
  const normalizedEntryPath = normalizeFolderPath(entryPath)
  const normalizedRootPath = rootPath ? normalizeFolderPath(rootPath) : ''
  if (!normalizedRootPath) return !normalizedEntryPath.includes('/')
  if (!normalizedEntryPath.startsWith(`${normalizedRootPath}/`)) return false
  const relativePath = normalizedEntryPath.slice(normalizedRootPath.length + 1)
  return relativePath.length > 0 && !relativePath.includes('/')
}

function isEntryInsideRoot(entryPath: string, rootPath?: string): boolean {
  const normalizedEntryPath = normalizeFolderPath(entryPath)
  const normalizedRootPath = rootPath ? normalizeFolderPath(rootPath) : ''
  if (!normalizedRootPath) return normalizedEntryPath.length > 0
  return normalizedEntryPath.startsWith(`${normalizedRootPath}/`)
}

function pathRelativeToRoot(entryPath: string, rootPath?: string): string | null {
  const normalizedRootPath = rootPath ? normalizeFolderPath(rootPath) : ''
  if (!normalizedRootPath) return normalizeFolderPath(entryPath)

  const normalizedEntryPath = normalizeFolderPath(entryPath)
  if (!normalizedEntryPath.startsWith(`${normalizedRootPath}/`)) return null
  return normalizedEntryPath.slice(normalizedRootPath.length + 1)
}

function isEntryInSelectedFolder(entryPath: string, folderRelPath: string, rootPath?: string): boolean {
  const relativeEntryPath = pathRelativeToRoot(entryPath, rootPath)
  return relativeEntryPath ? isInFolder(relativeEntryPath, folderRelPath) : false
}

function filterRootEntries(entries: VaultEntry[], rootPath: string | undefined): VaultEntry[] {
  const rootEntries = entries.filter((entry) => isDirectRootEntry(entry.path, rootPath))
  return rootEntries
}

function filterFolderEntries(
  entries: VaultEntry[],
  selection: Extract<SidebarSelection, { kind: 'folder' }>,
  showNonMarkdown: boolean,
): VaultEntry[] {
  const folderEntries = !selection.path
    ? selection.includeDescendants
      ? entries.filter((entry) => isEntryInsideRoot(entry.path, selection.rootPath))
      : filterRootEntries(entries, selection.rootPath)
    : entries.filter((entry) => isEntryInSelectedFolder(entry.path, selection.path, selection.rootPath))
  return showNonMarkdown ? folderEntries : folderEntries.filter(isMarkdown)
}

function filterTopLevelEntries(
  entries: VaultEntry[],
  selection: Extract<SidebarSelection, { kind: 'filter' }>,
  options: FilterEntriesOptions,
): VaultEntry[] {
  const filterableEntries = selection.filter === 'all'
    ? entries.filter((entry) => isAllNotesEntry(entry, options.allNotesFileVisibility))
    : entries.filter(isMarkdown)
  return filterByFilterType(filterableEntries, selection.filter)
}

function filterByKind(
  entries: VaultEntry[],
  selection: SidebarSelection,
  options: FilterEntriesOptions,
): VaultEntry[] {
  if (selection.kind === 'folder') {
    return filterFolderEntries(entries, selection, options.folderViewShowNonMarkdown === true)
  }
  return filterTopLevelEntries(entries, selection, options)
}

function filterByFilterType(entries: VaultEntry[], filter: string): VaultEntry[] {
  return filter === 'all' ? entries : []
}

export function filterEntries(
  entries: VaultEntry[],
  selection: SidebarSelection,
  options: FilterEntriesOptions = {},
): VaultEntry[] {
  return filterByKind(entries, selection, options)
}
