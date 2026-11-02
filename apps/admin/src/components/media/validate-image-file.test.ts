import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkFile, readImageSize } from './validate-image-file'

/** Un archivo con el tipo y, si se pasa, un peso que no es el real (sin armar 10 MB en memoria). */
function file(name: string, type: string, size?: number): File {
  const result = new File(['foto'], name, { type })
  if (size !== undefined) Object.defineProperty(result, 'size', { value: size })
  return result
}

/** Hace que `createImageBitmap` devuelva una foto de `width` × `height` y espía su `close`. */
function bitmapOf(width: number, height: number) {
  const close = vi.fn()
  const create = vi.fn(() => Promise.resolve({ width, height, close }))
  vi.stubGlobal('createImageBitmap', create)
  return { close, create }
}

/** Una `Image` falsa que "carga" con las medidas dadas, o falla si no hay medidas. */
function installFakeImage(size: { width: number; height: number } | null) {
  class FakeImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    naturalWidth = size?.width ?? 0
    naturalHeight = size?.height ?? 0

    set src(_value: string) {
      queueMicrotask(() => {
        if (size === null) this.onerror?.()
        else this.onload?.()
      })
    }
  }
  vi.stubGlobal('Image', FakeImage)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('readImageSize', () => {
  it('lee las medidas con createImageBitmap y libera el bitmap', async () => {
    const { close } = bitmapOf(1600, 900)
    await expect(readImageSize(file('mate.jpg', 'image/jpeg'))).resolves.toEqual({
      width: 1600,
      height: 900,
    })
    expect(close).toHaveBeenCalledOnce()
  })

  it('si createImageBitmap falla, usa una Image con una URL blob: que después revoca', async () => {
    vi.stubGlobal('createImageBitmap', () => Promise.reject(new Error('sin soporte')))
    installFakeImage({ width: 900, height: 1200 })
    const revoke = vi.spyOn(URL, 'revokeObjectURL')

    await expect(readImageSize(file('mate.png', 'image/png'))).resolves.toEqual({
      width: 900,
      height: 1200,
    })
    expect(revoke).toHaveBeenCalledWith(expect.stringMatching(/^blob:/))
  })

  it('rechaza con "No pudimos leer la foto." si no se puede abrir', async () => {
    vi.stubGlobal('createImageBitmap', () => Promise.reject(new Error('dañada')))
    installFakeImage(null)
    await expect(readImageSize(file('rota.jpg', 'image/jpeg'))).rejects.toThrow(
      'No pudimos leer la foto.',
    )
  })

  it('rechaza un valor que no es un archivo', async () => {
    // @ts-expect-error -- un valor que no es un Blob, como el que podría llegar sin tipos.
    await expect(readImageSize('mate.jpg')).rejects.toThrow(RangeError)
  })
})

describe('checkFile', () => {
  it('acepta JPG, PNG y WebP que cumplen las reglas', async () => {
    bitmapOf(1000, 1000)
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      await expect(checkFile(file('mate', type))).resolves.toBeNull()
    }
  })

  it('rechaza otros formatos antes de abrir la foto', async () => {
    const { create } = bitmapOf(1000, 1000)
    await expect(checkFile(file('mate.gif', 'image/gif'))).resolves.toBe(
      'Formato no admitido: usá JPG, PNG o WebP.',
    )
    await expect(checkFile(file('mate.heic', ''))).resolves.toBe(
      'Formato no admitido: usá JPG, PNG o WebP.',
    )
    expect(create).not.toHaveBeenCalled()
  })

  it('acepta hasta 10 MB justos y rechaza un byte más', async () => {
    bitmapOf(1000, 1000)
    await expect(checkFile(file('mate.jpg', 'image/jpeg', 10_485_760))).resolves.toBeNull()
    await expect(checkFile(file('mate.jpg', 'image/jpeg', 10_485_761))).resolves.toBe(
      'La foto pesa más de 10 MB.',
    )
  })

  it('acepta 800 px justos del lado menor y rechaza 799 con las medidas', async () => {
    bitmapOf(800, 3000)
    await expect(checkFile(file('mate.jpg', 'image/jpeg'))).resolves.toBeNull()
    bitmapOf(1200, 799)
    await expect(checkFile(file('mate.jpg', 'image/jpeg'))).resolves.toBe(
      'La foto tiene que medir al menos 800 px del lado menor (esta mide 1200 × 799 px).',
    )
  })

  it('devuelve "No pudimos leer la foto." si no se puede abrir', async () => {
    vi.stubGlobal('createImageBitmap', () => Promise.reject(new Error('dañada')))
    installFakeImage(null)
    await expect(checkFile(file('rota.jpg', 'image/jpeg'))).resolves.toBe(
      'No pudimos leer la foto.',
    )
  })
})
