import { useCallback } from 'react'

interface UseFolderRowInteractionsInput {
  hasChildren: boolean
  isSelected: boolean
  onSelect: () => void
  onToggle: () => void
}

export function useFolderRowInteractions({
  hasChildren,
  isSelected,
  onSelect,
  onToggle,
}: UseFolderRowInteractionsInput) {
  const handleSelectClick = useCallback(() => {
    if (!isSelected) {
      onSelect()
      return
    }
    if (hasChildren) onToggle()
  }, [hasChildren, isSelected, onSelect, onToggle])

  return {
    handleSelectClick,
  }
}
