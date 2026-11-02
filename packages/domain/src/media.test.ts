import { describe, expect, it } from 'vitest'
import {
  checkImageFile,
  IMAGE_UPLOAD_RULES,
  MAX_IMAGES,
  MEDIA_FOLDERS,
  MEDIA_PURPOSES,
} from './media'

const JPEG = { type: 'image/jpeg', size: 2_000_000 }

describe('constantes', () => {
  it('los usos de una foto', () => {
    expect(MEDIA_PURPOSES).toEqual(['product', 'category', 'partner', 'site'])
  })
  it('la carpeta de Cloudinary de cada uso', () => {
    expect(MEDIA_FOLDERS).toEqual({
      product: 'galpon/productos',
      category: 'galpon/lineas',
      partner: 'galpon/socios',
      site: 'galpon/sitio',
    })
  })
  it('las reglas de subida', () => {
    expect(IMAGE_UPLOAD_RULES).toEqual({
      acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxBytes: 10_485_760,
      minShortSide: 800,
    })
  })
  it('el cupo de fotos de cada uso', () => {
    expect(MAX_IMAGES).toEqual({ product: 8, category: 1, partner: 1, site: 1 })
  })
})

describe('checkImageFile', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('acepta %s', (type) => {
    expect(checkImageFile({ type, size: 1000, width: 1200, height: 900 })).toBeNull()
  })

  it.each(['image/gif', 'image/svg+xml', 'application/pdf', ''])('rechaza el tipo %j', (type) => {
    expect(checkImageFile({ type, size: 1000, width: 1200, height: 900 })).toBe('type')
  })

  it('acepta justo 10 MB y rechaza un byte más', () => {
    expect(checkImageFile({ ...JPEG, size: 10_485_760 })).toBeNull()
    expect(checkImageFile({ ...JPEG, size: 10_485_761 })).toBe('size')
  })

  it('acepta 800 px del lado menor y rechaza 799', () => {
    expect(checkImageFile({ ...JPEG, width: 800, height: 1200 })).toBeNull()
    expect(checkImageFile({ ...JPEG, width: 1200, height: 800 })).toBeNull()
    expect(checkImageFile({ ...JPEG, width: 799, height: 1200 })).toBe('dimensions')
    expect(checkImageFile({ ...JPEG, width: 1200, height: 799 })).toBe('dimensions')
  })

  it('sin medidas revisa solo el tipo y el peso', () => {
    expect(checkImageFile(JPEG)).toBeNull()
    expect(checkImageFile({ type: 'image/gif', size: 100 })).toBe('type')
    expect(checkImageFile({ ...JPEG, size: 10_485_761 })).toBe('size')
  })

  it('revisa el tipo antes que el peso, y el peso antes que las medidas', () => {
    expect(checkImageFile({ type: 'image/gif', size: 20_000_000, width: 10, height: 10 })).toBe(
      'type',
    )
    expect(checkImageFile({ ...JPEG, size: 20_000_000, width: 10, height: 10 })).toBe('size')
  })

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rechaza un peso de %s', (size) => {
    expect(() => checkImageFile({ ...JPEG, size })).toThrow(
      new RangeError(
        `El peso de la foto tiene que ser un entero de bytes desde 0; se recibió ${String(size)}.`,
      ),
    )
  })

  it.each([
    [0, 900],
    [900, -1],
    [900.5, 900],
    [Number.NaN, 900],
  ])('rechaza las medidas %s × %s', (width, height) => {
    expect(() => checkImageFile({ ...JPEG, width, height })).toThrow(
      new RangeError(
        `Las medidas de la foto tienen que ser enteros mayores a 0; se recibió ${String(width)} × ${String(height)}.`,
      ),
    )
  })

  it('rechaza una sola de las medidas', () => {
    expect(() => checkImageFile({ ...JPEG, width: 900 })).toThrow(
      new RangeError('Pasá el ancho y el alto de la foto juntos, o ninguno de los dos.'),
    )
    expect(() => checkImageFile({ ...JPEG, height: 900 })).toThrow(RangeError)
  })
})
