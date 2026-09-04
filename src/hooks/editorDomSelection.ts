export const EDITOR_CONTAINER_SELECTOR = '.editor__blocknote-container'
export const EDITOR_SCROLL_AREA_SELECTOR = '.editor-scroll-area'

const EDITOR_EDITABLE_SELECTOR = `${EDITOR_CONTAINER_SELECTOR} [contenteditable="true"]`

function queryScrollHost(selector: string): { scrollTop: number } | null {
  return document.querySelector(selector) as { scrollTop: number } | null
}

export function readLiveEditorScrollTop(): number | null {
  const scrollArea = queryScrollHost(EDITOR_SCROLL_AREA_SELECTOR)
  if (scrollArea) return scrollArea.scrollTop
  const container = queryScrollHost(EDITOR_CONTAINER_SELECTOR)
  return container ? container.scrollTop : null
}

export function restoreEditorScrollTop(scrollTop: number): void {
  for (const selector of [EDITOR_SCROLL_AREA_SELECTOR, EDITOR_CONTAINER_SELECTOR]) {
    const scrollHost = queryScrollHost(selector)
    if (scrollHost) scrollHost.scrollTop = scrollTop
  }
}

function getElementForNode(node: Node | null): Element | null {
  if (node instanceof Element) return node
  return node?.parentElement ?? null
}

function getEditorContainers(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(EDITOR_CONTAINER_SELECTOR))
}

function isElementInsideEditor(element: Element | null, containers: HTMLElement[]): boolean {
  return Boolean(element && containers.some((container) => container.contains(element)))
}

function isNodeInsideEditor(node: Node | null, containers: HTMLElement[]): boolean {
  return isElementInsideEditor(getElementForNode(node), containers)
}

function blurActiveEditorElement(containers: HTMLElement[]): void {
  const activeElement = document.activeElement
  if (!(activeElement instanceof HTMLElement)) return
  if (!isElementInsideEditor(activeElement, containers)) return

  activeElement.blur()
}

function clearSelectionIfInsideEditor(
  selection: Selection | null,
  containers: HTMLElement[],
): void {
  if (!selection) return

  const hasEditorAnchor = isNodeInsideEditor(selection.anchorNode, containers)
  const hasEditorFocus = isNodeInsideEditor(selection.focusNode, containers)
  if (!hasEditorAnchor && !hasEditorFocus) return

  selection.removeAllRanges()
}

function blurEditorEditableElements(): void {
  for (const editable of document.querySelectorAll<HTMLElement>(EDITOR_EDITABLE_SELECTOR)) {
    editable.blur()
  }
}

export function clearEditorDomSelection(): void {
  const containers = getEditorContainers()
  if (containers.length === 0) return

  blurActiveEditorElement(containers)
  clearSelectionIfInsideEditor(window.getSelection(), containers)
  blurEditorEditableElements()
}
