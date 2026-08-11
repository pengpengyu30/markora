export const RICH_EDITOR_EXTERNAL_CHANGE_EVENT = 'tolaria:rich-editor-external-change'
export const RICH_EDITOR_EXTERNAL_FLUSH_EVENT = 'tolaria:rich-editor-external-flush'

export type RichEditorExternalChangeSource = object

type RichEditorExternalChangeDetail = {
  source: RichEditorExternalChangeSource
}

function isExternalChangeForSource(
  event: Event,
  source: RichEditorExternalChangeSource,
): event is CustomEvent<RichEditorExternalChangeDetail> {
  return event instanceof CustomEvent && event.detail?.source === source
}

export function dispatchRichEditorExternalChange(
  source: RichEditorExternalChangeSource,
  target: EventTarget = window,
) {
  target.dispatchEvent(new CustomEvent<RichEditorExternalChangeDetail>(
    RICH_EDITOR_EXTERNAL_CHANGE_EVENT,
    {
      bubbles: true,
      composed: true,
      detail: { source },
    },
  ))
}

export function subscribeRichEditorExternalChange(
  source: RichEditorExternalChangeSource,
  onChange: () => void,
) {
  const handleExternalChange = (event: Event) => {
    if (isExternalChangeForSource(event, source)) onChange()
  }

  window.addEventListener(RICH_EDITOR_EXTERNAL_CHANGE_EVENT, handleExternalChange)
  return () => window.removeEventListener(RICH_EDITOR_EXTERNAL_CHANGE_EVENT, handleExternalChange)
}

export function dispatchRichEditorExternalFlush(target: EventTarget = window) {
  target.dispatchEvent(new Event(RICH_EDITOR_EXTERNAL_FLUSH_EVENT))
}

export function subscribeRichEditorExternalFlush(
  onFlush: () => void,
  target: EventTarget = window,
) {
  target.addEventListener(RICH_EDITOR_EXTERNAL_FLUSH_EVENT, onFlush)
  return () => target.removeEventListener(RICH_EDITOR_EXTERNAL_FLUSH_EVENT, onFlush)
}
