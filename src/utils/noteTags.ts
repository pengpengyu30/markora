import type { VaultEntry } from '../types'

export interface TagCount {
  name: string
  count: number
}

export const TAG_MAX_LENGTH = 15

export type TagInputError = 'invalid' | 'tooLong'

function normalizedTagValue(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return normalized.length > 0 ? normalized : null
}

export function normalizeNoteTags(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value]
  const tags: string[] = []
  const seen = new Set<string>()

  for (const item of values) {
    const tag = normalizedTagValue(item)
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    tags.push(tag)
  }

  return tags
}

export function normalizeTagDraft(value: string): string {
  return value.trim().toLowerCase()
}

export function getTagInputError(value: string): TagInputError | null {
  const normalized = normalizeTagDraft(value)
  if (!normalized) return null
  if (normalized.length > TAG_MAX_LENGTH) return 'tooLong'
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) ? null : 'invalid'
}

export function normalizeTagInput(value: string): string | null {
  const normalized = normalizeTagDraft(value)
  return normalized.length > 0 && getTagInputError(normalized) === null ? normalized : null
}

export function getEntryTags(entry: Pick<VaultEntry, 'properties'>): string[] {
  const tagsProperty = Object.entries(entry.properties ?? {})
    .find(([key]) => key.trim().toLowerCase() === 'tags')?.[1]
  return normalizeNoteTags(tagsProperty)
}

export function buildTagCounts(entries: Array<Pick<VaultEntry, 'properties'>>): TagCount[] {
  const counts = new Map<string, number>()

  for (const entry of entries) {
    for (const tag of getEntryTags(entry)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
}

export function filterEntriesByTags<T extends Pick<VaultEntry, 'properties'>>(
  entries: T[],
  selectedTags: string[],
): T[] {
  const normalizedSelectedTags = normalizeNoteTags(selectedTags)
  if (normalizedSelectedTags.length === 0) return entries

  return entries.filter((entry) => {
    const tags = new Set(getEntryTags(entry))
    return normalizedSelectedTags.every((tag) => tags.has(tag))
  })
}
