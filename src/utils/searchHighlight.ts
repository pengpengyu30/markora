export const SEARCH_HIGHLIGHT_CLASS = 'tolaria-search-highlight'
export const SEARCH_HIGHLIGHT_DURATION_MS = 2000
export const SEARCH_HIGHLIGHT_CLEANUP_DELAY_MS = SEARCH_HIGHLIGHT_DURATION_MS + 250

export interface SearchHighlightRequest {
  id: number
  path: string
  query: string
}

export interface SearchHighlightRange {
  from: number
  to: number
}

export function searchHighlightTokens(query: string): string[] {
  return query
    .trim()
    .split(/\s+/u)
    .map((token) => token.toLocaleLowerCase())
    .filter(Boolean)
}

export function findSearchHighlightRanges(text: string, query: string): SearchHighlightRange[] {
  const lowerText = text.toLocaleLowerCase()
  const ranges: SearchHighlightRange[] = []

  for (const token of searchHighlightTokens(query)) {
    let offset = lowerText.indexOf(token)
    while (offset >= 0) {
      ranges.push({ from: offset, to: offset + token.length })
      offset = lowerText.indexOf(token, offset + token.length)
    }
  }

  return ranges
    .sort((left, right) => left.from - right.from || left.to - right.to)
    .filter((range, index, sorted) => {
      const previous = sorted[index - 1]
      return !previous || range.from >= previous.to
    })
}
