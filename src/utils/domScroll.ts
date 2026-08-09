export function scrollSelectedHTMLChildIntoView(
  container: HTMLElement | null,
  selectedIndex: number,
): void {
  const selectedHTMLElement = container?.children.item(selectedIndex)
  if (selectedHTMLElement instanceof HTMLElement) {
    selectedHTMLElement.scrollIntoView({ block: 'nearest' })
  }
}

export function focusNoteListContainer(documentRef: Document): void {
  documentRef.querySelector<HTMLElement>('[data-testid="note-list-container"]')?.focus()
}
