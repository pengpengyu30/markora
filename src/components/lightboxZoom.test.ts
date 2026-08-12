import { describe, expect, it } from 'vitest'
import {
  LIGHTBOX_ZOOM_MAX,
  LIGHTBOX_ZOOM_MIN,
  createLightboxZoomState,
  lightboxZoomReducer,
} from './lightboxZoom'

describe('lightbox zoom state', () => {
  it('raises and lowers the scale from wheel input within the allowed range', () => {
    const zoomed = lightboxZoomReducer(createLightboxZoomState(), { type: 'wheel', deltaY: -120 })
    const restored = lightboxZoomReducer(zoomed, { type: 'wheel', deltaY: 120 })

    expect(zoomed.scale).toBeGreaterThan(1)
    expect(restored.scale).toBeCloseTo(1)
    expect(lightboxZoomReducer({ scale: LIGHTBOX_ZOOM_MAX, offset: { x: 0, y: 0 } }, { type: 'wheel', deltaY: -120 }).scale).toBe(LIGHTBOX_ZOOM_MAX)
    expect(lightboxZoomReducer({ scale: LIGHTBOX_ZOOM_MIN, offset: { x: 0, y: 0 } }, { type: 'wheel', deltaY: 120 }).scale).toBe(LIGHTBOX_ZOOM_MIN)
  })

  it('resets Fit and 1:1 to their scale with no pan offset', () => {
    const zoomed = { scale: 2.4, offset: { x: 90, y: -30 } }

    expect(lightboxZoomReducer(zoomed, { type: 'fit' })).toEqual(createLightboxZoomState())
    expect(lightboxZoomReducer(zoomed, { type: 'actual' })).toEqual({
      scale: 1,
      offset: { x: 0, y: 0 },
    })
  })

  it('pans only while zoomed and keeps Fit centered', () => {
    const centered = createLightboxZoomState()
    const zoomed = lightboxZoomReducer(centered, { type: 'zoomIn' })

    expect(lightboxZoomReducer(centered, { type: 'drag', dx: 40, dy: 20 })).toEqual(centered)
    expect(lightboxZoomReducer(zoomed, { type: 'drag', dx: 40, dy: 20 }).offset).toEqual({ x: 40, y: 20 })
  })
})
