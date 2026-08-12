import { useCallback, useEffect, useState, type RefObject } from 'react'
import { getDoubleClickedTarget, type ImageLightboxTarget } from '../utils/imageLightboxTarget'

type UseImageLightboxArgs = {
  containerRef: RefObject<HTMLDivElement | null>
}

type UseImageLightboxResult = {
  image: ImageLightboxTarget | null
  close: () => void
}

export function useImageLightbox({ containerRef }: UseImageLightboxArgs): UseImageLightboxResult {
  const [image, setImage] = useState<ImageLightboxTarget | null>(null)
  const close = useCallback(() => setImage(null), [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onDoubleClick = (event: MouseEvent) => {
      const nextImage = getDoubleClickedTarget(event.target)
      if (!nextImage) return

      event.preventDefault()
      setImage(nextImage)
    }

    container.addEventListener('dblclick', onDoubleClick, true)
    return () => container.removeEventListener('dblclick', onDoubleClick, true)
  }, [containerRef])

  return { image, close }
}
