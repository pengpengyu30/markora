import type { VaultEntry } from '../types'
import { deduplicateByPath, disambiguateTitles } from './wikilinkSuggestions'
import { bestSearchRank } from './fuzzyMatch'
import { filterSuggestionItems } from '@blocknote/core/extensions'
import type { WikilinkSuggestionItem } from '../components/WikilinkSuggestionMenu'
import { canonicalWikilinkTargetForEntry, relativePathStem } from './wikilink'

const MAX_RESULTS = 20

interface BaseSuggestionItem {
  title: string
  aliases: string[]
  entryTitle: string
  path: string
  entry?: VaultEntry
}

interface EnrichSuggestionOptions {
  showWorkspace?: boolean
}

export function hasMultipleSuggestionWorkspaces(items: { entry?: VaultEntry }[]): boolean {
  return new Set(items.map((item) => item.entry?.workspace?.alias).filter(Boolean)).size > 1
}

/** Build the canonical wikilink target: vault-relative path stem without a default alias. */
function buildTarget(item: BaseSuggestionItem, vaultPath: string, sourceEntry?: VaultEntry): string {
  if (item.entry) return canonicalWikilinkTargetForEntry(item.entry, vaultPath, sourceEntry)
  return relativePathStem(item.path, vaultPath)
}

/** Add onItemClick to raw suggestion candidates.
 *  Always inserts the canonical vault-relative path target so links are
 *  unambiguous and remain stable across renames. */
export function attachClickHandlers(
  candidates: BaseSuggestionItem[],
  insertWikilink: (target: string) => void,
  vaultPath: string,
  sourceEntry?: VaultEntry,
) {
  return candidates.map(item => ({
    ...item,
    onItemClick: () => insertWikilink(buildTarget(item, vaultPath, sourceEntry)),
  }))
}

/** Filter, deduplicate, disambiguate, and add workspace metadata to suggestions. */
export function enrichSuggestionItems(
  items: (BaseSuggestionItem & { onItemClick: () => void })[],
  query: string,
  options: EnrichSuggestionOptions = {},
): WikilinkSuggestionItem[] {
  const filtered = filterSuggestionItems(items, query)
  filtered.sort((a, b) =>
    bestSearchRank(query, a.entryTitle, a.aliases) - bestSearchRank(query, b.entryTitle, b.aliases),
  )
  const sliced = filtered.slice(0, MAX_RESULTS)
  const final = disambiguateTitles(deduplicateByPath(sliced))
  const showWorkspace = options.showWorkspace ?? hasMultipleSuggestionWorkspaces(final)
  return final.map(({ entry, ...rest }) => {
    return {
      ...rest,
      workspace: showWorkspace ? entry?.workspace ?? null : null,
    }
  })
}
