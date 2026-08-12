import { describe, expect, it } from 'vitest'
import { getDoubleClickedImageTarget, getDoubleClickedTarget } from './imageLightboxTarget'

describe('getDoubleClickedImageTarget', () => {
  it('returns the src and alt when the target is an image element with a src', () => {
    const img = document.createElement('img')
    img.src = 'https://example.com/cat.png'
    img.alt = 'Sleeping cat'

    expect(getDoubleClickedImageTarget(img)).toEqual({
      kind: 'image',
      src: 'https://example.com/cat.png',
      alt: 'Sleeping cat',
    })
  })

  it('returns an empty alt when the image has no alt text', () => {
    const img = document.createElement('img')
    img.src = 'https://example.com/cat.png'

    expect(getDoubleClickedImageTarget(img)).toEqual({
      kind: 'image',
      src: 'https://example.com/cat.png',
      alt: '',
    })
  })

  it('returns null when the target is an image element without a src', () => {
    const img = document.createElement('img')

    expect(getDoubleClickedImageTarget(img)).toBeNull()
  })

  it('returns null when the target is not an image element', () => {
    const div = document.createElement('div')

    expect(getDoubleClickedImageTarget(div)).toBeNull()
  })

  it('returns the nested BlockNote image when the wrapper is double-clicked', () => {
    const wrapper = document.createElement('div')
    wrapper.className = 'bn-visual-media-wrapper'
    const img = document.createElement('img')
    img.src = 'https://example.com/wrapped.png'
    img.alt = 'Wrapped image'
    wrapper.appendChild(img)

    expect(getDoubleClickedImageTarget(wrapper)).toEqual({
      kind: 'image',
      src: 'https://example.com/wrapped.png',
      alt: 'Wrapped image',
    })
  })

  it('ignores caption and resize controls inside image blocks', () => {
    const wrapper = document.createElement('div')
    wrapper.className = 'bn-visual-media-wrapper'
    const img = document.createElement('img')
    img.src = 'https://example.com/wrapped.png'
    const caption = document.createElement('figcaption')
    caption.className = 'bn-file-caption'
    const resizeHandle = document.createElement('div')
    resizeHandle.className = 'bn-resize-handle'
    wrapper.append(img, caption, resizeHandle)

    expect(getDoubleClickedImageTarget(caption)).toBeNull()
    expect(getDoubleClickedImageTarget(resizeHandle)).toBeNull()
  })

  it('returns null when the target is null', () => {
    expect(getDoubleClickedImageTarget(null)).toBeNull()
  })

  it('ignores tracking pixel images smaller than the visibility threshold', () => {
    const img = document.createElement('img')
    img.src = 'https://example.com/pixel.gif'
    Object.defineProperty(img, 'naturalWidth', { value: 1, configurable: true })
    Object.defineProperty(img, 'naturalHeight', { value: 1, configurable: true })

    expect(getDoubleClickedImageTarget(img)).toBeNull()
  })

  it('allows unloaded images whose natural dimensions are still unknown', () => {
    const img = document.createElement('img')
    img.src = 'https://example.com/loading.png'
    Object.defineProperty(img, 'naturalWidth', { value: 0, configurable: true })
    Object.defineProperty(img, 'naturalHeight', { value: 0, configurable: true })

    expect(getDoubleClickedImageTarget(img)).toEqual({
      kind: 'image',
      src: 'https://example.com/loading.png',
      alt: '',
    })
  })

  it('returns an SVG target for a Mermaid double-click', () => {
    const figure = document.createElement('figure')
    figure.className = 'mermaid-diagram'
    const viewport = document.createElement('div')
    viewport.className = 'mermaid-diagram__viewport'
    viewport.innerHTML = '<svg aria-label="Rendered Mermaid"><g><text>A to B</text></g></svg>'
    figure.appendChild(viewport)

    const text = viewport.querySelector('text')
    expect(getDoubleClickedTarget(text)).toEqual({
      kind: 'svg',
      svg: '<svg aria-label="Rendered Mermaid"><g><text>A to B</text></g></svg>',
      alt: 'Mermaid diagram',
    })
  })

  it('ignores Mermaid controls when resolving a double-click target', () => {
    const figure = document.createElement('figure')
    figure.className = 'mermaid-diagram'
    const button = document.createElement('button')
    const viewport = document.createElement('div')
    viewport.className = 'mermaid-diagram__viewport'
    viewport.innerHTML = '<svg><text>A to B</text></svg>'
    figure.append(button, viewport)

    expect(getDoubleClickedTarget(button)).toBeNull()
  })
})
