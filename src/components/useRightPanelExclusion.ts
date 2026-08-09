import { useCallback, useState } from 'react'
import { trackEvent } from '../lib/telemetry'

interface RightPanelExclusionOptions {
  rightPanelCollapsed: boolean
  onToggleRightPanel: () => void
}

function closeRightPanelIfOpen({ rightPanelCollapsed, onToggleRightPanel }: RightPanelExclusionOptions): void {
  if (!rightPanelCollapsed) onToggleRightPanel()
}

export function useRightPanelExclusion({ rightPanelCollapsed, onToggleRightPanel }: RightPanelExclusionOptions) {
  const [showTableOfContents, setShowTableOfContents] = useState(false)
  const [showBacklinks, setShowBacklinks] = useState(false)

  const handleToggleTableOfContents = useCallback(() => {
    const nextOpen = !showTableOfContents
    trackEvent('table_of_contents_toggled', { open: nextOpen ? 1 : 0 })

    if (nextOpen) {
      setShowBacklinks(false)
      if (rightPanelCollapsed) onToggleRightPanel()
    } else {
      closeRightPanelIfOpen({ rightPanelCollapsed, onToggleRightPanel })
    }
    setShowTableOfContents(nextOpen)
  }, [onToggleRightPanel, rightPanelCollapsed, showTableOfContents])

  const handleToggleBacklinks = useCallback(() => {
    const nextOpen = !showBacklinks
    setShowTableOfContents(false)

    if (nextOpen) {
      if (rightPanelCollapsed) onToggleRightPanel()
    } else {
      closeRightPanelIfOpen({ rightPanelCollapsed, onToggleRightPanel })
    }
    setShowBacklinks(nextOpen)
  }, [onToggleRightPanel, rightPanelCollapsed, showBacklinks])

  return {
    handleToggleBacklinks,
    handleToggleTableOfContents,
    showBacklinks,
    showTableOfContents,
  }
}
