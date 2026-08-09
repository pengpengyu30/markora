import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_STORAGE_KEYS, LEGACY_APP_STORAGE_KEYS } from '../constants/appStorage'
import { makeEntry } from '../test-utils/noteListTestUtils'
import {
  clearListSortFromLocalStorage,
  formatSearchSubtitle,
  formatSubtitle,
  getSortComparator,
  getSortOptionLabel,
  loadSortPreferences,
  parseSortConfig,
  relativeDate,
  saveSortPreferences,
  serializeSortConfig,
} from './noteListHelpers'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('noteListHelpers extra coverage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-21T12:00:00Z'))
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('formats relative dates across future, recent, and older timestamps', () => {
    const nowSeconds = Math.floor(Date.now() / 1000)

    expect(relativeDate(nowSeconds + 86400)).toBe('Apr 22')
    expect(relativeDate(nowSeconds - 30)).toBe('just now')
    expect(relativeDate(nowSeconds - 5 * 60)).toBe('5m ago')
    expect(relativeDate(nowSeconds - 2 * 3600)).toBe('2h ago')
    expect(relativeDate(nowSeconds - 3 * 86400)).toBe('3d ago')
    expect(relativeDate(nowSeconds - 10 * 86400)).toBe('Apr 11')
  })

  it('builds note subtitles for empty, linked, and edited notes', () => {
    const modifiedEntry = makeEntry({
      title: 'Project',
      modifiedAt: Math.floor(Date.now() / 1000) - 3600,
      createdAt: Math.floor(Date.now() / 1000) - 86400 * 2,
      wordCount: 1200,
      outgoingLinks: ['alpha', 'beta'],
    })
    const emptyEntry = makeEntry({
      title: 'Empty',
      modifiedAt: null,
      createdAt: null,
      wordCount: 0,
      outgoingLinks: [],
    })

    expect(formatSubtitle(modifiedEntry)).toBe('April 21, 2026 · 1,200 words · 2 links')
    expect(formatSubtitle(emptyEntry)).toBe('Empty')
    expect(formatSearchSubtitle(modifiedEntry)).toBe('April 21, 2026 · Created April 19, 2026 · 1,200 words · 2 links')
  })

  it('keeps note subtitle counts stable under non-English default number formatting', () => {
    const originalToLocaleString = Number.prototype.toLocaleString
    vi.spyOn(Number.prototype, 'toLocaleString').mockImplementation(function (
      this: number,
      locales?: Intl.LocalesArgument,
      options?: Intl.NumberFormatOptions,
    ) {
      return originalToLocaleString.call(this, locales ?? 'de-DE', options)
    })

    const entry = makeEntry({
      title: 'Project',
      modifiedAt: Math.floor(Date.now() / 1000) - 3600,
      createdAt: Math.floor(Date.now() / 1000) - 86400 * 2,
      wordCount: 1200,
      outgoingLinks: ['alpha', 'beta'],
    })

    expect(formatSubtitle(entry)).toBe('April 21, 2026 · 1,200 words · 2 links')
    expect(formatSearchSubtitle(entry)).toBe('April 21, 2026 · Created April 19, 2026 · 1,200 words · 2 links')
    expect(formatSubtitle(entry, 'iso')).toBe('2026-04-21 · 1,200 words · 2 links')
    expect(formatSearchSubtitle(entry, 'european')).toBe('21/4/2026 · Created 19/4/2026 · 1,200 words · 2 links')
  })

  it('labels the three supported sort keys', () => {
    expect(getSortOptionLabel('title')).toBe('Title')
  })

  it('sorts entries by the supported built-in comparators', () => {
    const entries = [
      makeEntry({
        title: 'Gamma',
        createdAt: 10,
        modifiedAt: 30,
        status: 'Done',
      }),
      makeEntry({
        title: 'Alpha',
        createdAt: 20,
        modifiedAt: 20,
        status: 'Active',
      }),
      makeEntry({
        title: 'Beta',
        createdAt: 15,
        modifiedAt: 25,
        status: null,
      }),
    ]

    expect([...entries].sort(getSortComparator('title', 'asc')).map((entry) => entry.title)).toEqual(['Alpha', 'Beta', 'Gamma'])
    expect([...entries].sort(getSortComparator('created', 'desc')).map((entry) => entry.title)).toEqual(['Alpha', 'Beta', 'Gamma'])
    const entriesWithMissingTitle = [
      makeEntry({ title: 'Beta' }),
      makeEntry({ title: null as unknown as string }),
    ]
    expect([...entriesWithMissingTitle].sort(getSortComparator('title', 'asc')).map((entry) => entry.title)).toEqual([null, 'Beta'])
  })

  it('serializes, parses, loads, and saves sort preferences with migration support', () => {
    const serialized = serializeSortConfig({ option: 'title', direction: 'asc' })
    expect(serialized).toBe('title:asc')
    expect(parseSortConfig(serialized)).toEqual({ option: 'title', direction: 'asc' })
    expect(parseSortConfig('property:Priority:desc')).toEqual({ option: 'modified', direction: 'desc' })
    expect(parseSortConfig('date:desc')).toEqual({ option: 'modified', direction: 'desc' })
    expect(parseSortConfig('status:asc')).toEqual({ option: 'modified', direction: 'asc' })
    expect(parseSortConfig('broken')).toBeNull()
    expect(parseSortConfig('title:sideways')).toBeNull()
    expect(parseSortConfig('property::asc')).toBeNull()

    localStorage.setItem(APP_STORAGE_KEYS.sortPreferences, JSON.stringify({
      '__list__': 'title',
      'type:Project': { option: 'created', direction: 'asc' },
      'legacy': { option: 'status', direction: 'desc' },
    }))

    expect(loadSortPreferences()).toEqual({
      '__list__': { option: 'title', direction: 'asc' },
      'type:Project': { option: 'created', direction: 'asc' },
      legacy: { option: 'modified', direction: 'desc' },
    })

    saveSortPreferences({
      '__list__': { option: 'modified', direction: 'desc' },
    })

    expect(localStorage.getItem(APP_STORAGE_KEYS.sortPreferences)).toBe(JSON.stringify({
      '__list__': { option: 'modified', direction: 'desc' },
    }))
    expect(localStorage.getItem(LEGACY_APP_STORAGE_KEYS.sortPreferences)).toBeNull()

    clearListSortFromLocalStorage()
    expect(localStorage.getItem(APP_STORAGE_KEYS.sortPreferences)).toBeNull()
    expect(localStorage.getItem(LEGACY_APP_STORAGE_KEYS.sortPreferences)).toBeNull()
  })

})
