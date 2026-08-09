import type { VaultEntry } from '../../types'
import type { DateDisplayFormat } from '../../utils/dateDisplay'

interface NoteListSearchContext {
  allEntries: VaultEntry[]
  dateDisplayFormat?: DateDisplayFormat
  fullTextResultPaths?: Set<string>
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

function searchableString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function resolveSearchableText(entry: VaultEntry): string[] {
  return [
    searchableString(entry.title),
    searchableString(entry.snippet),
  ]
}

export function matchesNoteListQuery(
  entry: VaultEntry,
  query: string,
  context: NoteListSearchContext,
): boolean {
  const normalizedQuery = normalizeQuery(query)
  if (!normalizedQuery) return true
  if (context.fullTextResultPaths?.has(entry.path)) return true
  return resolveSearchableText(entry).some((value) => value.toLowerCase().includes(normalizedQuery))
}

export function filterEntriesByNoteListQuery(
  entries: VaultEntry[],
  query: string,
  context: NoteListSearchContext,
): VaultEntry[] {
  const normalizedQuery = normalizeQuery(query)
  if (!normalizedQuery) return entries
  return entries.filter((entry) => matchesNoteListQuery(entry, normalizedQuery, context))
}
