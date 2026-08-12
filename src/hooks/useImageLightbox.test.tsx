import { act, fireEvent, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { createRef } from 'react'
import { useImageLightbox } from './useImageLightbox'

function createHookTarget() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const ref = createRef<HTMLDivElement>()
  ref.current = container
  const view = renderHook(() => useImageLightbox({ containerRef: ref }))

  return { container, view }
}

function appendImage(container: HTMLElement, src = 'https://example.com/photo.png') {
  const img = document.createElement('img')
  img.src = src
  img.alt = 'Preview target'
  container.appendChild(img)
  return img
}

function appendMermaid(container: HTMLElement) {
  const figure = document.createElement('figure')
  figure.className = 'mermaid-diagram'
  const viewport = document.createElement('div')
  viewport.className = 'mermaid-diagram__viewport'
  viewport.innerHTML = '<svg aria-label="Rendered Mermaid"><text>A to B</text></svg>'
  figure.appendChild(viewport)
  container.appendChild(figure)
  return viewport.querySelector('text')!
}

beforeEach(() => {
  document.body.replaceChildren()
})

describe('useImageLightbox', () => {
  it('opens the image lightbox on image double-click', () => {
    const { container, view } = createHookTarget()
    const img = appendImage(container)

    fireEvent.doubleClick(img)

    expect(view.result.current.image).toEqual({
      kind: 'image',
      src: 'https://example.com/photo.png',
      alt: 'Preview target',
    })
  })

  it('opens before BlockNote can stop the double-click from bubbling', () => {
    const { container, view } = createHookTarget()
    const img = appendImage(container)
    img.addEventListener('dblclick', (event) => event.stopPropagation())

    fireEvent.doubleClick(img)

    expect(view.result.current.image?.kind === 'image' ? view.result.current.image.src : null).toBe('https://example.com/photo.png')
  })

  it('leaves single-click image selection alone', () => {
    const { container, view } = createHookTarget()
    const img = appendImage(container)

    fireEvent.click(img)

    expect(view.result.current.image).toBeNull()
  })

  it('ignores double-clicks on non-image targets', () => {
    const { container, view } = createHookTarget()
    const text = document.createElement('span')
    container.appendChild(text)

    fireEvent.doubleClick(text)

    expect(view.result.current.image).toBeNull()
  })

  it('closes the current lightbox image', () => {
    const { container, view } = createHookTarget()
    const img = appendImage(container)

    fireEvent.doubleClick(img)
    act(() => {
      view.result.current.close()
    })

    expect(view.result.current.image).toBeNull()
  })

  it('opens a Mermaid SVG target on double-click', () => {
    const { container, view } = createHookTarget()
    const text = appendMermaid(container)

    fireEvent.doubleClick(text)

    expect(view.result.current.image).toEqual({
      kind: 'svg',
      svg: '<svg aria-label="Rendered Mermaid"><text>A to B</text></svg>',
      alt: 'Mermaid diagram',
    })
  })
})
