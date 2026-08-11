import { useCallback, useState } from 'react'

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
