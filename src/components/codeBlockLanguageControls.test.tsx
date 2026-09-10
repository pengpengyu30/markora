import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CodeBlockLanguageControls } from './codeBlockLanguageControls'

function codeBlockDom({ includeNative = true }: { includeNative?: boolean } = {}) {
  const editorElement = document.createElement('div')
  editorElement.className = 'bn-editor'
  editorElement.setAttribute('contenteditable', 'false')

  const blockContainer = document.createElement('div')
  blockContainer.dataset.nodeType = 'blockContainer'
  blockContainer.dataset.id = 'code-block-1'

  const blockContent = document.createElement('div')
  blockContent.className = 'bn-block-content'
  blockContent.dataset.contentType = 'codeBlock'

  const nativeControl = includeNative ? document.createElement('select') : null
  if (nativeControl) {
    nativeControl.disabled = true
    nativeControl.append(new Option('Plain Text', 'text'), new Option('C++', 'cpp'))
    nativeControl.value = 'text'
    const controlHost = document.createElement('div')
    controlHost.appendChild(nativeControl)
    blockContent.appendChild(controlHost)
  }
  const pre = document.createElement('pre')
  pre.appendChild(document.createElement('code'))
  blockContent.appendChild(pre)
  blockContainer.appendChild(blockContent)
  editorElement.appendChild(blockContainer)
  document.body.appendChild(editorElement)

  return { blockContent, editorElement, nativeControl }
}

describe('CodeBlockLanguageControls', () => {
  it('mounts one live picker only when a code block is interacted with', async () => {
    const { blockContent, editorElement } = codeBlockDom({ includeNative: false })
    const editor = {
      domElement: editorElement,
      getBlock: vi.fn(() => ({ id: 'code-block-1', type: 'codeBlock', props: { language: 'text' } })),
      isEditable: false,
      onChange: vi.fn(() => vi.fn()),
      updateBlock: vi.fn(),
    }

    render(<CodeBlockLanguageControls editor={editor as never} />)

    expect(document.querySelector('[data-slot="select-trigger"]')).not.toBeInTheDocument()

    await act(async () => {
      fireEvent.pointerOver(blockContent)
    })

    const trigger = await waitFor(() => {
      const control = document.querySelector('[data-slot="select-trigger"]')
      if (!control || control.tagName !== 'BUTTON') throw new Error('Language trigger was unavailable')
      return control
    })
    expect(trigger.closest('[data-code-block-id]')).toHaveAttribute('data-code-block-id', 'code-block-1')
    expect(trigger).toBeDisabled()

    await act(async () => {
      editor.isEditable = true
      editorElement.setAttribute('contenteditable', 'true')
    })
    await waitFor(() => expect(trigger).toBeEnabled())

    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('option', { name: 'C++' }))

    expect(editor.updateBlock).toHaveBeenCalledWith('code-block-1', {
      props: { language: 'cpp' },
    })
  })

  it('keeps the picker mounted while the pointer enters the portaled option list', async () => {
    const { blockContent, editorElement } = codeBlockDom({ includeNative: false })
    const editor = {
      domElement: editorElement,
      getBlock: vi.fn(() => ({ id: 'code-block-1', type: 'codeBlock', props: { language: 'markdown' } })),
      isEditable: true,
      onChange: vi.fn(() => vi.fn()),
      updateBlock: vi.fn(),
    }

    render(<CodeBlockLanguageControls editor={editor as never} />)
    fireEvent.pointerOver(blockContent)

    const overlay = await waitFor(() => {
      const element = document.querySelector('.editor__code-block-language-overlay')
      if (!(element instanceof HTMLElement)) throw new Error('Language overlay was unavailable')
      return element
    })
    const selectContent = document.createElement('div')
    selectContent.dataset.slot = 'select-content'
    const option = document.createElement('div')
    selectContent.appendChild(option)
    document.body.appendChild(selectContent)

    fireEvent.pointerOut(overlay, { relatedTarget: option })
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 50))
    })

    expect(document.querySelector('.editor__code-block-language-overlay')).toBeInTheDocument()
  })
})
