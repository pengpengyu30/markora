import { useState, useRef, useEffect, useCallback, type RefObject } from 'react'
import type { SearchResult } from '../types'
import { invoke } from '@tauri-apps/api/core'
import { isTauri, mockInvoke } from '../mock-tauri'
import { GITIGNORED_VISIBILITY_CHANGED_EVENT } from '../lib/gitignoredVisibilityEvents'

interface SearchResultData {
  title: string
  path: string
  snippet: string
  score: number
  note_type: string | null
}

interface SearchResponseData {
  results: SearchResultData[]
  total_matches?: number
  elapsed_ms: number
}

const DEBOUNCE_MS = 300
const SEARCH_RESULT_LIMIT = 200

function searchCall(args: Record<string, unknown>): Promise<SearchResponseData> {
  return isTauri()
    ? invoke<SearchResponseData>('search_vault', args)
    : mockInvoke<SearchResponseData>('search_vault', args)
}

function mapResults(raw: SearchResultData[]): SearchResult[] {
  const seen = new Set<string>()
  return raw
    .map(r => ({
      title: r.title,
      path: r.path,
      snippet: r.snippet,
      score: r.score,
      noteType: r.note_type,
    }))
    .filter(r => {
      if (seen.has(r.path)) return false
      seen.add(r.path)
      return true
    })
}

function useGitignoredVisibilitySearchRefresh({
  active,
  performSearch,
  query,
}: {
  active: boolean
  performSearch: (query: string) => void
  query: string
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleGitignoredVisibilityChanged = () => {
      if (active && query.trim()) performSearch(query)
    }

    window.addEventListener(GITIGNORED_VISIBILITY_CHANGED_EVENT, handleGitignoredVisibilityChanged)
    return () => {
      window.removeEventListener(GITIGNORED_VISIBILITY_CHANGED_EVENT, handleGitignoredVisibilityChanged)
    }
  }, [active, performSearch, query])
}

function useSearchLifecycle(
  active: boolean,
  reset: () => void,
  debounceRef: RefObject<ReturnType<typeof setTimeout> | null>,
  searchGenRef: RefObject<number>,
) {
  useEffect(() => {
    searchGenRef.current++
    clearTimeout(debounceRef.current ?? undefined)
    debounceRef.current = null
    if (!active) return
    return reset
  }, [active, debounceRef, reset, searchGenRef])
}

export function useUnifiedSearch(vaultPath: string | string[], active: boolean) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [elapsedMs, setElapsedMs] = useState<number | null>(null)
  const [totalMatches, setTotalMatches] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchGenRef = useRef(0)

  const reset = useCallback(() => {
    setQuery('')
    setResults([])
    setSelectedIndex(0)
    setElapsedMs(null)
    setTotalMatches(0)
    setLoading(false)
    searchGenRef.current++
  }, [])

  useSearchLifecycle(active, reset, debounceRef, searchGenRef)

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setElapsedMs(null)
      setTotalMatches(0)
      setLoading(false)
      return
    }
    searchGenRef.current++
    const gen = searchGenRef.current
    setLoading(true)
    try {
      const paths = Array.isArray(vaultPath) ? vaultPath : [vaultPath]
      const responses = await Promise.all(paths
        .filter((path) => path.trim().length > 0)
        .map((path) => searchCall({
          vaultPath: path,
          query: q,
          mode: 'keyword',
          limit: SEARCH_RESULT_LIMIT,
        })))
      if (gen !== searchGenRef.current) return
      const mappedResults = mapResults(responses.flatMap((response) => response.results))
      setResults(mappedResults.slice(0, SEARCH_RESULT_LIMIT))
      setTotalMatches(responses.reduce(
        (sum, response) => sum + (response.total_matches ?? response.results.length),
        0,
      ))
      setElapsedMs(responses.reduce((sum, response) => sum + response.elapsed_ms, 0))
      setSelectedIndex(0)
    } catch {
      if (gen !== searchGenRef.current) return
    } finally {
      if (gen === searchGenRef.current) setLoading(false)
    }
  }, [vaultPath])

  const updateQuery = useCallback((nextQuery: string) => {
    setQuery(nextQuery)
    if (nextQuery.trim()) return
    clearTimeout(debounceRef.current ?? undefined)
    debounceRef.current = null
    setResults([])
    setElapsedMs(null)
    setTotalMatches(0)
    searchGenRef.current++
    setLoading(false)
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current ?? undefined)
    debounceRef.current = null
    if (!query.trim()) return
    debounceRef.current = setTimeout(() => { void performSearch(query) }, DEBOUNCE_MS)
    return () => {
      clearTimeout(debounceRef.current ?? undefined)
      debounceRef.current = null
    }
  }, [query, performSearch])

  useGitignoredVisibilitySearchRefresh({
    active,
    performSearch: (nextQuery) => { void performSearch(nextQuery) },
    query,
  })

  return {
    query,
    setQuery: updateQuery,
    results,
    selectedIndex,
    setSelectedIndex,
    loading,
    elapsedMs,
    totalMatches,
  }
}
