import type { ImageData } from './types'

export const loadImage = async (src: string): Promise<ImageData> => {
  const img = await new Promise<ImageData>((res) => {
    const _img = new Image()
    _img.onload = () =>
      res({ src: _img.src, w: _img.width, h: _img.height, alt: _img.alt })
    _img.src = src
  })

  return img
}
