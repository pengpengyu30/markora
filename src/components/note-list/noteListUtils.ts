import type { VaultEntry, SidebarSelection, NoteStatus } from '../../types'
import { translate, type AppLocale } from '../../lib/i18n'
import { vaultRelativePathLabel } from '../../utils/notePathIdentity'

export interface DeletedNoteEntry extends VaultEntry {
  __deletedNotePreview: true
}

export function resolveHeaderTitle(
  selection: SidebarSelection,
  locale: AppLocale = 'en',
  projectLabel?: string | null,
): string {
  return resolveNonEntityHeaderTitle(selection, locale, projectLabel)
}

export function isDeletedNoteEntry(entry: VaultEntry): entry is DeletedNoteEntry {
  return '__deletedNotePreview' in entry && entry.__deletedNotePreview === true
}

function resolveNonEntityHeaderTitle(
  selection: SidebarSelection,
  locale: AppLocale,
  projectLabel?: string | null,
): string {
  return resolveFolderTitle(selection, projectLabel)
    ?? translate(locale, 'noteList.title.notes')
}

function searchableTitle(entry: { title?: unknown }): string {
  return typeof entry.title === 'string' ? entry.title : ''
}

export function filterByQuery<T extends { title?: unknown }>(items: T[], query: string): T[] {
  return query ? items.filter((e) => searchableTitle(e).toLowerCase().includes(query)) : items
}

export interface ClickActions {
  onReplace: (entry: VaultEntry) => void
  multiSelect: { selectRange: (path: string) => void; clear: () => void; setAnchor: (path: string) => void }
}

function isRangeSelectionClick(event: Pick<React.MouseEvent, 'shiftKey'>): boolean {
  return event.shiftKey
}

export function routeNoteClick(entry: VaultEntry, e: React.MouseEvent, actions: ClickActions) {
  if (isRangeSelectionClick(e)) {
    actions.multiSelect.selectRange(entry.path)
    return
  }

  actions.multiSelect.clear()
  actions.multiSelect.setAnchor(entry.path)
  actions.onReplace(entry)
}

export function createNoteStatusResolver(
  getNoteStatus: ((path: string) => NoteStatus) | undefined,
): (path: string) => NoteStatus {
  if (getNoteStatus) return getNoteStatus
  return () => 'clean'
}

export function toggleSetMember<T>(set: Set<T>, member: T): Set<T> {
  const next = new Set(set)
  if (next.has(member)) next.delete(member)
  else next.add(member)
  return next
}

function resolveFolderTitle(selection: SidebarSelection, projectLabel?: string | null): string | null {
  if (selection.kind !== 'folder') return null
  if (selection.path.trim()) return vaultRelativePathLabel(selection.path)
  return projectLabel?.trim() || (selection.rootPath ? vaultRelativePathLabel(selection.rootPath) : null)
}
