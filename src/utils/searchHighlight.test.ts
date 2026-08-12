import { describe, expect, it } from 'vitest'
import {
  SEARCH_HIGHLIGHT_DURATION_MS,
  findSearchHighlightRanges,
  searchHighlightTokens,
} from './searchHighlight'

describe('search highlight ranges', () => {
  it('splits a global search query into case-insensitive content ranges', () => {
    expect(searchHighlightTokens('  tom   jerry ')).toEqual(['tom', 'jerry'])
    expect(findSearchHighlightRanges('Tom Jerry\nTom', 'tom jerry')).toEqual([
      { from: 0, to: 3 },
      { from: 4, to: 9 },
      { from: 10, to: 13 },
    ])
  })

  it('returns no ranges for an empty query or unmatched terms', () => {
    expect(findSearchHighlightRanges('Tom Jerry', '   ')).toEqual([])
    expect(findSearchHighlightRanges('Tom Jerry', 'sylvester')).toEqual([])
  })

  it('keeps the transient highlight duration at two seconds', () => {
    expect(SEARCH_HIGHLIGHT_DURATION_MS).toBe(2000)
  })
})
