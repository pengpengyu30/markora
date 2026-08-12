import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImageLightbox } from './ImageLightbox'

describe('ImageLightbox', () => {
  it('renders no content or toolbar when there is no target', () => {
    render(<ImageLightbox image={null} onClose={() => {}} />)

    expect(screen.queryByTestId('image-lightbox')).not.toBeInTheDocument()
    expect(screen.queryByTestId('image-lightbox-zoom-toolbar')).not.toBeInTheDocument()
  })

  it('renders the selected image in a dialog', () => {
    render(
      <ImageLightbox
        image={{ kind: 'image', src: 'https://example.com/photo.png', alt: 'A lake' }}
        onClose={() => {}}
      />,
    )

    expect(screen.getByTestId('image-lightbox')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'A lake' })).toHaveAttribute('src', 'https://example.com/photo.png')
    expect(screen.getByText('Image preview')).toHaveClass('sr-only')
  })

  it('falls back to localized alt text when the image has no alt', () => {
    render(
      <ImageLightbox
        image={{ kind: 'image', src: 'https://example.com/photo.png', alt: '' }}
        locale="zh-CN"
        onClose={() => {}}
      />,
    )

    expect(screen.getByRole('img', { name: '图像预览' })).toBeInTheDocument()
  })

  it('calls onClose when the dialog closes', () => {
    const onClose = vi.fn()
    render(
      <ImageLightbox
        image={{ kind: 'image', src: 'https://example.com/photo.png', alt: 'A lake' }}
        onClose={onClose}
      />,
    )

    fireEvent.keyDown(screen.getByTestId('image-lightbox'), { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders sanitized SVG content with zoom controls', () => {
    render(
      <ImageLightbox
        image={{ kind: 'svg', svg: '<svg aria-label="Diagram"><text>A to B</text></svg>', alt: 'Mermaid diagram' }}
        onClose={() => {}}
      />,
    )

    expect(screen.getByTestId('image-lightbox-svg').querySelector('svg')).not.toBeNull()
    expect(screen.getByTestId('image-lightbox-svg')).not.toHaveClass('overflow-hidden')
    expect(screen.getByTestId('image-lightbox-viewport')).toHaveClass('!overflow-hidden')
    expect(screen.getByTestId('image-lightbox')).toHaveClass('!max-w-none')
    expect(screen.getByTestId('image-lightbox-zoom-toolbar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fit to window' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Actual size' })).toBeInTheDocument()
  })

  it('resets zoom and pan before the lightbox is reopened', () => {
    const onClose = vi.fn()
    const target = { kind: 'image' as const, src: 'https://example.com/photo.png', alt: 'A lake' }
    const { rerender } = render(<ImageLightbox image={target} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(screen.getByText('125%')).toBeInTheDocument()

    fireEvent.keyDown(screen.getByTestId('image-lightbox'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    rerender(<ImageLightbox image={null} onClose={onClose} />)
    rerender(<ImageLightbox image={target} onClose={onClose} />)

    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('zooms from the empty lightbox surface and stops at both scale limits', () => {
    render(
      <ImageLightbox
        image={{ kind: 'image', src: 'https://example.com/photo.png', alt: 'A lake' }}
        onClose={() => {}}
      />,
    )

    const surface = screen.getByTestId('image-lightbox')
    fireEvent.wheel(surface, { deltaY: -120 })
    expect(screen.getByText('110%')).toBeInTheDocument()

    for (let index = 0; index < 100; index += 1) {
      fireEvent.wheel(surface, { deltaY: -120 })
    }
    expect(screen.getByText('800%')).toBeInTheDocument()

    for (let index = 0; index < 100; index += 1) {
      fireEvent.wheel(surface, { deltaY: 120 })
    }
    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  it('zooms from the full-screen dialog backdrop', () => {
    render(
      <ImageLightbox
        image={{ kind: 'image', src: 'https://example.com/photo.png', alt: 'A lake' }}
        onClose={() => {}}
      />,
    )

    const backdrop = document.querySelector<HTMLElement>('[data-slot="dialog-overlay"]')
    expect(backdrop).not.toBeNull()
    fireEvent.wheel(backdrop!, { deltaY: -120 })

    expect(screen.getByText('110%')).toBeInTheDocument()
  })
})
