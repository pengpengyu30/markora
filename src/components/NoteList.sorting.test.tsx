import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { APP_STORAGE_KEYS, LEGACY_APP_STORAGE_KEYS } from '../constants/appStorage'
import { getSortComparator } from '../utils/noteListHelpers'
import { makeEntry, mockEntries, renderNoteList } from '../test-utils/noteListTestUtils'

describe('getSortComparator', () => {
  it('sorts by modified date descending', () => {
    const entries = [
      makeEntry({ title: 'A', modifiedAt: 1000 }),
      makeEntry({ title: 'B', modifiedAt: 3000 }),
      makeEntry({ title: 'C', modifiedAt: 2000 }),
    ]

    expect(entries.sort(getSortComparator('modified')).map((entry) => entry.title)).toEqual(['B', 'C', 'A'])
  })

  it('sorts by created date descending', () => {
    const entries = [
      makeEntry({ title: 'A', createdAt: 3000, modifiedAt: 1000 }),
      makeEntry({ title: 'B', createdAt: 1000, modifiedAt: 3000 }),
      makeEntry({ title: 'C', createdAt: 2000, modifiedAt: 2000 }),
    ]

    expect(entries.sort(getSortComparator('created')).map((entry) => entry.title)).toEqual(['A', 'C', 'B'])
  })

  it('falls back to modifiedAt when createdAt is null', () => {
    const entries = [
      makeEntry({ title: 'A', createdAt: null, modifiedAt: 5000 }),
      makeEntry({ title: 'B', createdAt: 2000, modifiedAt: 1000 }),
    ]

    expect(entries.sort(getSortComparator('created')).map((entry) => entry.title)).toEqual(['A', 'B'])
  })

  it('sorts by title alphabetically', () => {
    const entries = [
      makeEntry({ title: 'Zebra' }),
      makeEntry({ title: 'Alpha' }),
      makeEntry({ title: 'Middle' }),
    ]

    expect(entries.sort(getSortComparator('title')).map((entry) => entry.title)).toEqual(['Alpha', 'Middle', 'Zebra'])
  })

  it('supports ascending modified sorting', () => {
    const entries = [
      makeEntry({ title: 'A', modifiedAt: 1000 }),
      makeEntry({ title: 'B', modifiedAt: 3000 }),
      makeEntry({ title: 'C', modifiedAt: 2000 }),
    ]

    expect(entries.sort(getSortComparator('modified', 'asc')).map((entry) => entry.title)).toEqual(['A', 'C', 'B'])
  })

  it('supports descending title sorting', () => {
    const entries = [
      makeEntry({ title: 'Zebra' }),
      makeEntry({ title: 'Alpha' }),
      makeEntry({ title: 'Middle' }),
    ]

    expect(entries.sort(getSortComparator('title', 'desc')).map((entry) => entry.title)).toEqual(['Zebra', 'Middle', 'Alpha'])
  })

  it('supports ascending created sorting', () => {
    const entries = [
      makeEntry({ title: 'A', createdAt: 3000, modifiedAt: 1000 }),
      makeEntry({ title: 'B', createdAt: 1000, modifiedAt: 3000 }),
      makeEntry({ title: 'C', createdAt: 2000, modifiedAt: 2000 }),
    ]

    expect(entries.sort(getSortComparator('created', 'asc')).map((entry) => entry.title)).toEqual(['B', 'C', 'A'])
  })

})

describe('NoteList sort controls', () => {
  beforeEach(() => {
    try {
      localStorage.removeItem(APP_STORAGE_KEYS.sortPreferences)
      localStorage.removeItem(LEGACY_APP_STORAGE_KEYS.sortPreferences)
    } catch {
      // ignore storage failures in tests
    }
  })

  const zamEntries = [
    makeEntry({ path: '/a.md', title: 'Zebra', modifiedAt: 3000 }),
    makeEntry({ path: '/b.md', title: 'Alpha', modifiedAt: 1000 }),
    makeEntry({ path: '/c.md', title: 'Middle', modifiedAt: 2000 }),
  ]

  function openListSortMenu(entries = mockEntries) {
    renderNoteList({ entries })
    fireEvent.click(screen.getByTestId('sort-button-__list__'))
  }

  it('shows the sort button in flat list view', () => {
    renderNoteList()
    expect(screen.getByTestId('sort-button-__list__')).toBeInTheDocument()
  })

  it('opens the sort menu and lists all built-in options', () => {
    openListSortMenu()
    expect(screen.getByTestId('sort-menu-__list__')).toBeInTheDocument()
    expect(screen.getByTestId('sort-option-modified')).toBeInTheDocument()
    expect(screen.getByTestId('sort-option-created')).toBeInTheDocument()
    expect(screen.getByTestId('sort-option-title')).toBeInTheDocument()
  })

  it('keeps the sort menu in a viewport-clamped fixed layer', () => {
    renderNoteList()
    const trigger = screen.getByTestId('sort-button-__list__')
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 20,
      top: 20,
      right: 44,
      bottom: 40,
      left: 0,
      width: 44,
      height: 20,
      toJSON: () => ({}),
    })

    fireEvent.click(trigger)

    const menu = screen.getByTestId('sort-menu-__list__')
    expect(menu).toHaveClass('fixed')
    expect(menu).toHaveStyle({ left: '8px', top: '44px' })
  })

  it('changes list order when a different sort option is selected', () => {
    openListSortMenu(zamEntries)

    let titles = screen.getAllByText(/Zebra|Alpha|Middle/).map((element) => element.textContent)
    expect(titles).toEqual(['Zebra', 'Middle', 'Alpha'])

    fireEvent.click(screen.getByTestId('sort-option-title'))

    titles = screen.getAllByText(/Zebra|Alpha|Middle/).map((element) => element.textContent)
    expect(titles).toEqual(['Alpha', 'Middle', 'Zebra'])
  })

  it('closes the sort menu after choosing an option', () => {
    openListSortMenu()
    fireEvent.click(screen.getByTestId('sort-option-title'))
    expect(screen.queryByTestId('sort-menu-__list__')).not.toBeInTheDocument()
  })

  it('shows direction arrows for every sort option', () => {
    openListSortMenu()
    expect(screen.getByTestId('sort-dir-asc-modified')).toBeInTheDocument()
    expect(screen.getByTestId('sort-dir-desc-modified')).toBeInTheDocument()
    expect(screen.getByTestId('sort-dir-asc-title')).toBeInTheDocument()
    expect(screen.getByTestId('sort-dir-desc-title')).toBeInTheDocument()
  })

  it('reverses list order when a direction arrow is chosen', () => {
    openListSortMenu(zamEntries)

    let titles = screen.getAllByText(/Zebra|Alpha|Middle/).map((element) => element.textContent)
    expect(titles).toEqual(['Zebra', 'Middle', 'Alpha'])

    fireEvent.click(screen.getByTestId('sort-dir-asc-modified'))

    titles = screen.getAllByText(/Zebra|Alpha|Middle/).map((element) => element.textContent)
    expect(titles).toEqual(['Alpha', 'Middle', 'Zebra'])
  })

  it('persists the chosen direction', () => {
    const entries = [
      makeEntry({ path: '/a.md', title: 'Zebra', modifiedAt: 3000 }),
      makeEntry({ path: '/b.md', title: 'Alpha', modifiedAt: 1000 }),
    ]

    renderNoteList({ entries })
    fireEvent.click(screen.getByTestId('sort-button-__list__'))
    fireEvent.click(screen.getByTestId('sort-dir-desc-title'))

    const titles = screen.getAllByText(/Zebra|Alpha/).map((element) => element.textContent)
    expect(titles).toEqual(['Zebra', 'Alpha'])
  })

  it('keeps the sort direction icon in sync with the active sort', () => {
    renderNoteList()
    expect(screen.getByTestId('sort-direction-icon-__list__')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('sort-button-__list__'))
    fireEvent.click(screen.getByTestId('sort-option-title'))

    expect(screen.getByTestId('sort-direction-icon-__list__')).toBeInTheDocument()
  })

})
