import { hasLocalMatch } from 'next/dist/shared/lib/match-local-pattern'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { STORE_IMAGES } from './images'

/** Lo que haría el optimizador de Next (`/_next/image?url=`) con ese `url`: aceptarlo o no. */
function accepts(url: string): boolean {
  return hasLocalMatch(STORE_IMAGES.localPatterns, url)
}

/** Fotos de ejemplo de los productos (`public/mock-images`). */
const MOCK_IMAGES = readdirSync(
  fileURLToPath(new URL('../../public/mock-images', import.meta.url)),
).map((file) => `/mock-images/${file}`)

describe('STORE_IMAGES', () => {
  it('acepta las imágenes locales que muestra la tienda', () => {
    for (const url of [
      '/brand/galpon-mark.png',
      '/hero/world/yerbal.jpg',
      '/hero/world/pieces.jpg',
      '/hero/world/bombilla.jpg',
      '/hero/world/ritual.jpg',
      ...MOCK_IMAGES,
    ]) {
      expect(accepts(url), url).toBe(true)
    }
    expect(MOCK_IMAGES.length).toBeGreaterThan(0)
  })

  it('rechaza los alias con búsqueda o con caracteres codificados', () => {
    for (const url of [
      '/brand/galpon-mark.png?v=1',
      '/mock-images/mate-imperial-premium.jpg?a=b',
      '/brand/galpon-%6Dark.png',
      '/mock-images/mate%2Dimperial-premium.jpg',
      '/hero/world/yerbal.jpg?x',
      '/hero/world/%79erbal.jpg',
    ]) {
      expect(accepts(url), url).toBe(false)
    }
  })

  it('rechaza las rutas que la tienda no optimiza', () => {
    for (const url of [
      '/brand/galpon-wordmark.png',
      '/hero/3d/yerba-albedo.jpg',
      '/cursors/mate.png',
      '/mock-images/sub/foto.jpg',
      '/_next/static/media/algo.png',
      '/api/v1/products',
    ]) {
      expect(accepts(url), url).toBe(false)
    }
  })

  it('los alias con fragmento, "?" vacío o ".." pasan el patrón (Next normaliza antes de comparar): los acota el tope del caché de disco', () => {
    expect(accepts('/brand/galpon-mark.png#otro')).toBe(true)
    expect(accepts('/brand/galpon-mark.png?')).toBe(true)
    expect(accepts('/mock-images/../brand/galpon-mark.png')).toBe(true)
  })

  it('solo una calidad, la que usa next/image por omisión', () => {
    expect(STORE_IMAGES.qualities).toEqual([75])
  })

  it('los anchos no pasan de la foto local más ancha (1920 px)', () => {
    const widths = [...STORE_IMAGES.deviceSizes, ...STORE_IMAGES.imageSizes]
    expect(Math.max(...widths)).toBe(1920)
    expect(widths).toHaveLength(new Set(widths).size)
  })

  it('el caché de disco del optimizador tiene un tope', () => {
    expect(STORE_IMAGES.maximumDiskCacheSize).toBeGreaterThan(0)
    expect(STORE_IMAGES.maximumDiskCacheSize).toBeLessThanOrEqual(512 * 1024 * 1024)
  })
})
