import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TestApp } from '../../test/render'
import { createTestApp } from '../../test/render'
import { MediaUploadError } from './media.types'
import { createSimulatedUploader } from './simulated-uploader'

/** Una llamada a `canvas.toDataURL`, con el tamaño que tenía el canvas. */
interface CanvasCall {
  width: number
  height: number
  type: string | undefined
  quality: unknown
}

/** Una foto cualquiera; las medidas las da `createImageBitmap` (falso). */
function photo(name = 'mate.jpg'): File {
  return new File(['foto'], name, { type: 'image/jpeg' })
}

/** Uploader simulado contra la API de prueba del test. */
function uploaderFor(app: TestApp, durationMs = 0) {
  const { registerMockImage } = app.context
  if (registerMockImage === null)
    throw new Error('La app del test tiene que estar en modo de prueba.')
  return createSimulatedUploader({ api: app.api, registerMockImage, durationMs })
}

/**
 * Espía `toDataURL`: anota el tamaño del canvas y responde con `respond` (por omisión, un data URL
 * corto del tipo pedido).
 */
function spyCanvas(respond?: (type: string | undefined, quality: unknown) => string) {
  const calls: CanvasCall[] = []
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function toDataURL(
    this: HTMLCanvasElement,
    type?: string,
    quality?: unknown,
  ) {
    calls.push({ width: this.width, height: this.height, type, quality })
    return respond === undefined
      ? `data:${type ?? 'image/png'};base64,AAAA`
      : respond(type, quality)
  })
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('createSimulatedUploader', () => {
  it('reduce la foto a 640 px en WebP 0,8, avanza en 5 pasos y la registra con las medidas originales', async () => {
    const app = await createTestApp({ demo: false })
    vi.stubGlobal('createImageBitmap', () =>
      Promise.resolve({ width: 2000, height: 1000, close: () => undefined }),
    )
    const calls = spyCanvas()
    const progress: number[] = []

    const result = await uploaderFor(app, 50).upload(photo(), {
      purpose: 'product',
      onProgress: (value) => progress.push(value),
    })

    expect(progress).toEqual([20, 40, 60, 80, 100])
    expect(calls).toEqual([{ width: 640, height: 320, type: 'image/webp', quality: 0.8 }])
    expect(result).toEqual({
      publicId: expect.stringMatching(/^galpon\/productos\/mock-[0-9a-f-]{36}$/) as string,
      url: 'data:image/webp;base64,AAAA',
      width: 2000,
      height: 1000,
    })
    expect(app.mockDb.db.media[result.publicId]).toMatchObject({
      url: 'data:image/webp;base64,AAAA',
      width: 2000,
      height: 1000,
    })
  })

  it('no agranda una foto chica y usa la carpeta de cada uso', async () => {
    const app = await createTestApp({ demo: false })
    vi.stubGlobal('createImageBitmap', () =>
      Promise.resolve({ width: 500, height: 400, close: () => undefined }),
    )
    const calls = spyCanvas()
    const result = await uploaderFor(app).upload(photo(), { purpose: 'category' })
    expect(calls[0]).toMatchObject({ width: 500, height: 400 })
    expect(result.publicId).toMatch(/^galpon\/lineas\/mock-/)
  })

  it('si el navegador no da WebP, usa JPEG', async () => {
    const app = await createTestApp({ demo: false })
    const calls = spyCanvas((type) =>
      type === 'image/webp' ? 'data:image/png;base64,PNG' : `data:${String(type)};base64,JPG`,
    )
    const result = await uploaderFor(app).upload(photo(), { purpose: 'product' })
    expect(calls.map((call) => [call.type, call.quality])).toEqual([
      ['image/webp', 0.8],
      ['image/jpeg', 0.8],
    ])
    expect(result.url).toBe('data:image/jpeg;base64,JPG')
  })

  it('si pasa de 200 000 caracteres, la repite a 480 px y calidad 0,6', async () => {
    const app = await createTestApp({ demo: false })
    const calls = spyCanvas((type, quality) =>
      quality === 0.8
        ? `data:${String(type)};base64,${'A'.repeat(200_000)}`
        : `data:${String(type)};base64,CHICA`,
    )
    const result = await uploaderFor(app).upload(photo(), { purpose: 'product' })
    expect(calls.map(({ width, height, quality }) => [width, height, quality])).toEqual([
      [640, 640, 0.8],
      [480, 480, 0.6],
    ])
    expect(result.url).toBe('data:image/webp;base64,CHICA')
    expect(result).toMatchObject({ width: 1000, height: 1000 })
  })

  it('un archivo error-* falla en el primer intento y el reintento sale bien', async () => {
    const app = await createTestApp({ demo: false })
    const uploader = uploaderFor(app)
    const file = photo('error-mate.jpg')

    const error = await uploader
      .upload(file, { purpose: 'product' })
      .catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(MediaUploadError)
    expect(error).toMatchObject({
      reason: 'simulated',
      status: null,
      message: 'Falló la subida simulada (el archivo empieza con error-). Reintentá.',
    })
    expect(Object.keys(app.mockDb.db.media)).toHaveLength(0)

    await expect(uploader.upload(file, { purpose: 'product' })).resolves.toMatchObject({
      url: 'data:image/webp;base64,AAAA',
    })
    // Otro archivo error-* (otro ítem) vuelve a fallar la primera vez.
    await expect(
      uploader.upload(photo('error-otro.jpg'), { purpose: 'product' }),
    ).rejects.toMatchObject({ reason: 'simulated' })
  })

  it('se cancela con la señal y no registra la foto', async () => {
    const app = await createTestApp({ demo: false })
    const controller = new AbortController()
    const progress: number[] = []
    const upload = uploaderFor(app, 1000).upload(photo(), {
      purpose: 'product',
      signal: controller.signal,
      onProgress: (value) => progress.push(value),
    })
    await vi.waitFor(() => {
      expect(progress).toContain(20)
    })
    controller.abort()

    await expect(upload).rejects.toMatchObject({ name: 'AbortError' })
    expect(progress).toEqual([20])
    expect(Object.keys(app.mockDb.db.media)).toHaveLength(0)
  })

  it('sin sesión, la firma da 401 y rechaza con el motivo unauthorized', async () => {
    const app = await createTestApp({ demo: false })
    app.mockDb.db.adminSession = null
    await expect(uploaderFor(app).upload(photo(), { purpose: 'product' })).rejects.toMatchObject({
      reason: 'unauthorized',
      status: 401,
    })
  })

  it('rechaza una duración negativa', async () => {
    const app = await createTestApp({ demo: false })
    expect(() => uploaderFor(app, -1)).toThrow(RangeError)
  })
})
