import { render } from '@testing-library/react'
import { useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { useEditorFocusScope } from './editorFocusOwnership'

function FocusGuardHarness() {
  const editorRef = useRef<HTMLDivElement | null>(null)
  useEditorFocusScope(editorRef)

  return (
    <div ref={editorRef} data-testid="editor-scope" />
  )
}

describe('editor focus ownership', () => {
  it('restores the native focus method after the editor guard unmounts', () => {
    const nativeDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'focus')
    const nativeFocus = HTMLElement.prototype.focus
    const view = render(<FocusGuardHarness />)

    expect(HTMLElement.prototype.focus).not.toBe(nativeFocus)

    view.unmount()
    if (nativeDescriptor) Object.defineProperty(HTMLElement.prototype, 'focus', nativeDescriptor)

    expect(HTMLElement.prototype.focus).toBe(nativeFocus)
  })
})
