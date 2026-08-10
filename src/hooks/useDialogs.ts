import { useState, useCallback } from 'react'

export function useDialogs() {
  const [showQuickOpen, setShowQuickOpen] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showRestoreDeletedNote, setShowRestoreDeletedNote] = useState(false)

  const openQuickOpen = useCallback(() => setShowQuickOpen(true), [])
  const closeQuickOpen = useCallback(() => setShowQuickOpen(false), [])
  const openCommandPalette = useCallback(() => setShowCommandPalette(true), [])
  const closeCommandPalette = useCallback(() => setShowCommandPalette(false), [])
  const openSettings = useCallback(() => setShowSettings(true), [])
  const closeSettings = useCallback(() => setShowSettings(false), [])
  const openSearch = useCallback(() => setShowSearch(true), [])
  const closeSearch = useCallback(() => setShowSearch(false), [])
  const openRestoreDeletedNote = useCallback(() => setShowRestoreDeletedNote(true), [])
  const closeRestoreDeletedNote = useCallback(() => setShowRestoreDeletedNote(false), [])

  return {
    showQuickOpen, openQuickOpen, closeQuickOpen,
    showCommandPalette, openCommandPalette, closeCommandPalette,
    showSettings, openSettings, closeSettings,
    showSearch, openSearch, closeSearch,
    showRestoreDeletedNote, openRestoreDeletedNote, closeRestoreDeletedNote,
  }
}
