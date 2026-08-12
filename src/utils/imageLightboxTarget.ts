export type ImageLightboxTarget =
  | {
      kind: 'image'
      src: string
      alt: string
    }
  | {
      kind: 'svg'
      svg: string
      alt: string
    }

const MIN_VIEWABLE_DIMENSION = 16
const IMAGE_WRAPPER_SELECTOR = '.bn-visual-media-wrapper'
const IMAGE_INTERACTION_IGNORE_SELECTOR = [
  '.bn-file-caption',
  '.bn-resize-handle',
  '.bn-add-file-button',
  '.bn-file-name-with-icon',
  'button',
  '[role="button"]',
].join(', ')
const MERMAID_FIGURE_SELECTOR = 'figure.mermaid-diagram'
const MERMAID_VIEWPORT_SELECTOR = '.mermaid-diagram__viewport'

export function getDoubleClickedTarget(target: EventTarget | null): ImageLightboxTarget | null {
  const element = target instanceof Element ? target : null
  if (!element || element.closest(IMAGE_INTERACTION_IGNORE_SELECTOR)) return null

  const image = resolveImageElement(target)
  if (image?.src && !isTooSmallToView(image)) {
    return {
      kind: 'image',
      src: image.src,
      alt: image.getAttribute('alt')?.trim() ?? '',
    }
  }

  const figure = element.closest(MERMAID_FIGURE_SELECTOR)
  const svg = figure?.querySelector(`${MERMAID_VIEWPORT_SELECTOR} svg`)
  if (!(svg instanceof SVGElement)) return null

  return {
    kind: 'svg',
    svg: svg.outerHTML,
    alt: 'Mermaid diagram',
  }
}

export function getDoubleClickedImageTarget(target: EventTarget | null): Extract<ImageLightboxTarget, { kind: 'image' }> | null {
  const resolved = getDoubleClickedTarget(target)
  return resolved?.kind === 'image' ? resolved : null
}

function resolveImageElement(target: EventTarget | null): HTMLImageElement | null {
  if (target instanceof HTMLImageElement) return target
  if (!(target instanceof Element)) return null
  return imageInWrapper(target.closest(IMAGE_WRAPPER_SELECTOR))
}

function imageInWrapper(wrapper: Element | null): HTMLImageElement | null {
  if (!wrapper) return null
  const image = wrapper.querySelector('img')
  if (!(image instanceof HTMLImageElement)) return null
  return image
}

function isTooSmallToView(image: HTMLImageElement): boolean {
  const width = image.naturalWidth
  const height = image.naturalHeight
  if (width === 0 && height === 0) return false
  return width < MIN_VIEWABLE_DIMENSION && height < MIN_VIEWABLE_DIMENSION
}
