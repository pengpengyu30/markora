export const LIGHTBOX_ZOOM_MIN = 0.25
export const LIGHTBOX_ZOOM_MAX = 8
export const LIGHTBOX_ZOOM_FIT = 1
export const LIGHTBOX_ZOOM_STEP = 1.25
export const LIGHTBOX_WHEEL_STEP = 1.1

export interface LightboxZoomOffset {
  x: number
  y: number
}

export interface LightboxZoomState {
  scale: number
  offset: LightboxZoomOffset
}

export type LightboxZoomAction =
  | { type: 'wheel'; deltaY: number }
  | { type: 'zoomIn' }
  | { type: 'zoomOut' }
  | { type: 'fit' }
  | { type: 'actual' }
  | { type: 'drag'; dx: number; dy: number }

export function createLightboxZoomState(): LightboxZoomState {
  return {
    scale: LIGHTBOX_ZOOM_FIT,
    offset: { x: 0, y: 0 },
  }
}

function clampScale(scale: number): number {
  return Math.min(LIGHTBOX_ZOOM_MAX, Math.max(LIGHTBOX_ZOOM_MIN, scale))
}

function setScale(state: LightboxZoomState, scale: number): LightboxZoomState {
  const nextScale = clampScale(scale)
  return {
    scale: nextScale,
    offset: nextScale <= LIGHTBOX_ZOOM_FIT ? { x: 0, y: 0 } : state.offset,
  }
}

export function lightboxZoomReducer(state: LightboxZoomState, action: LightboxZoomAction): LightboxZoomState {
  switch (action.type) {
    case 'wheel':
      if (action.deltaY === 0) return state
      return setScale(state, state.scale * (action.deltaY < 0 ? LIGHTBOX_WHEEL_STEP : 1 / LIGHTBOX_WHEEL_STEP))
    case 'zoomIn':
      return setScale(state, state.scale * LIGHTBOX_ZOOM_STEP)
    case 'zoomOut':
      return setScale(state, state.scale / LIGHTBOX_ZOOM_STEP)
    case 'fit':
    case 'actual':
      return createLightboxZoomState()
    case 'drag':
      if (state.scale <= LIGHTBOX_ZOOM_FIT) return state
      return {
        ...state,
        offset: {
          x: state.offset.x + action.dx,
          y: state.offset.y + action.dy,
        },
      }
  }
}
