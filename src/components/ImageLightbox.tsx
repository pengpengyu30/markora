import { useEffect, useReducer, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'
import { translate, type AppLocale } from '../lib/i18n'
import type { ImageLightboxTarget } from '../utils/imageLightboxTarget'
import {
  createLightboxZoomState,
  lightboxZoomReducer,
  type LightboxZoomAction,
  type LightboxZoomState,
} from './lightboxZoom'
import { SafeSvgDiv } from './SafeMarkup'
import { Button } from './ui/button'

type ImageLightboxProps = {
  image: ImageLightboxTarget | null
  locale?: AppLocale
  onClose: () => void
  dialogClassName?: string
  contentClassName?: string
  contentTestId?: string
}

type DragState = {
  pointerId: number
  x: number
  y: number
}

function targetKey(target: ImageLightboxTarget | null): string | null {
  if (!target) return null
  return target.kind === 'image' ? `image:${target.src}` : `svg:${target.svg}`
}

function ZoomToolbar({ locale, onZoom, zoom }: { locale: AppLocale; zoom: LightboxZoomState; onZoom: (action: LightboxZoomAction) => void }) {
  const labels = {
    zoomIn: translate(locale, 'editor.imageLightbox.zoomIn'),
    zoomOut: translate(locale, 'editor.imageLightbox.zoomOut'),
    fit: translate(locale, 'editor.imageLightbox.fit'),
    actual: translate(locale, 'editor.imageLightbox.actualSize'),
  }

  return (
    <div
      aria-label={translate(locale, 'editor.imageLightbox.toolbar')}
      className="flex items-center gap-1 rounded-md border border-border/60 bg-background/90 p-1 shadow-lg backdrop-blur"
      data-testid="image-lightbox-zoom-toolbar"
      role="toolbar"
    >
      <Button aria-label={labels.zoomOut} onClick={() => onZoom({ type: 'zoomOut' })} size="sm" type="button" variant="ghost">
        −
      </Button>
      <span aria-live="polite" className="min-w-12 text-center text-xs tabular-nums text-muted-foreground">
        {Math.round(zoom.scale * 100)}%
      </span>
      <Button aria-label={labels.zoomIn} onClick={() => onZoom({ type: 'zoomIn' })} size="sm" type="button" variant="ghost">
        +
      </Button>
      <Button aria-label={labels.fit} onClick={() => onZoom({ type: 'fit' })} size="sm" type="button" variant="ghost">
        {labels.fit}
      </Button>
      <Button aria-label={labels.actual} onClick={() => onZoom({ type: 'actual' })} size="sm" type="button" variant="ghost">
        {labels.actual}
      </Button>
    </div>
  )
}

function LightboxContent({
  contentClassName,
  contentTestId,
  image,
  locale,
  onZoom,
  title,
  zoom,
}: {
  contentClassName?: string
  contentTestId?: string
  image: ImageLightboxTarget
  locale: AppLocale
  zoom: LightboxZoomState
  onZoom: (action: LightboxZoomAction) => void
  title: string
}) {
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<DragState | null>(null)

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || zoom.scale <= 1) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    setDragging(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    onZoom({ type: 'drag', dx: event.clientX - drag.x, dy: event.clientY - drag.y })
    drag.x = event.clientX
    drag.y = event.clientY
  }

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    dragRef.current = null
    setDragging(false)
  }

  const transform = `translate(${zoom.offset.x}px, ${zoom.offset.y}px) scale(${zoom.scale})`
  const accessibleLabel = image.alt || title

  return (
    <>
      <div
        aria-label={accessibleLabel}
        className={`flex min-h-0 w-full min-w-0 flex-1 items-center justify-center !overflow-hidden ${contentClassName ?? ''} ${dragging ? 'cursor-grabbing' : zoom.scale > 1 ? 'cursor-grab' : 'cursor-default'}`}
        data-testid={contentTestId ?? 'image-lightbox-viewport'}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
      >
        <div className="origin-center" style={{ transform }}>
          {image.kind === 'image' ? (
            <img
              alt={accessibleLabel}
              className="max-h-[calc(90vh-7rem)] max-w-[90vw] rounded-md object-contain shadow-2xl"
              data-testid="image-lightbox-image"
              src={image.src}
            />
          ) : (
            <SafeSvgDiv
              aria-label={accessibleLabel}
              className="max-h-[calc(90vh-7rem)] max-w-[90vw] rounded-md shadow-2xl"
              data-testid="image-lightbox-svg"
              role="img"
              svg={image.svg}
            />
          )}
        </div>
      </div>
      <ZoomToolbar locale={locale} onZoom={onZoom} zoom={zoom} />
    </>
  )
}

export function ImageLightbox({ contentClassName, contentTestId, dialogClassName, image, locale = 'en', onClose }: ImageLightboxProps) {
  const title = translate(locale, 'editor.imageLightbox.title')
  const open = image !== null
  const [zoom, dispatchZoom] = useReducer(lightboxZoomReducer, undefined, createLightboxZoomState)
  const imageKey = targetKey(image)

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    dispatchZoom({ type: 'wheel', deltaY: event.deltaY })
  }

  useEffect(() => {
    dispatchZoom({ type: 'fit' })
  }, [imageKey])

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent
        aria-describedby={undefined}
        className={`!flex !h-[calc(100dvh-32px)] !w-[calc(100vw-32px)] !max-w-none flex-col items-center justify-center border-none bg-transparent p-4 shadow-none ${dialogClassName ?? ''}`}
        data-testid="image-lightbox"
        onEscapeKeyDown={(event) => {
          event.preventDefault()
          onClose()
        }}
        onOverlayWheelCapture={handleWheel}
        onWheelCapture={handleWheel}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {image && <LightboxContent contentClassName={contentClassName} contentTestId={contentTestId} image={image} locale={locale} onZoom={dispatchZoom} title={title} zoom={zoom} />}
      </DialogContent>
    </Dialog>
  )
}
