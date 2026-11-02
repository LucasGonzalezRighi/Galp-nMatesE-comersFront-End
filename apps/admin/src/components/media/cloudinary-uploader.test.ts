import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTestApp, TEST_NOW } from '../../test/render'
import { CLOUDINARY_UPLOAD_TIMEOUT_MS, createCloudinaryUploader } from './cloudinary-uploader'
import { FakeXhr, installFakeXhr, nextXhr } from './fake-xhr.test-helper'
import { MediaUploadError } from './media.types'

/** Respuesta de Cloudinary a una subida que salió bien. */
const CLOUDINARY_OK = {
  public_id: 'galpon/productos/mate-imperial',
  secure_url:
    'https://res.cloudinary.com/galpon/image/upload/v1/galpon/productos/mate-imperial.jpg',
  width: 1200,
  height: 1500,
  format: 'jpg',
}

/** Una foto cualquiera (Cloudinary no revisa las medidas acá). */
function photo(name = 'mate.jpg'): File {
  return new File(['foto'], name, { type: 'image/jpeg' })
}

/** Uploader de Cloudinary contra la API simulada, con la sesión iniciada. */
async function setup() {
  installFakeXhr()
  const app = await createTestApp({ demo: false })
  return { app, uploader: createCloudinaryUploader({ api: app.api }) }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createCloudinaryUploader', () => {
  it('sube a Cloudinary con exactamente los 5 campos firmados y devuelve la foto', async () => {
    const { uploader } = await setup()
    const file = photo()
    const progress: number[] = []
    const upload = uploader.upload(file, {
      purpose: 'product',
      onProgress: (value) => progress.push(value),
    })
    const xhr = await nextXhr()

    expect(xhr.method).toBe('POST')
    expect(xhr.url).toBe('https://api.cloudinary.com/v1_1/galpon-mock/image/upload')
    expect(xhr.timeout).toBe(CLOUDINARY_UPLOAD_TIMEOUT_MS)
    expect(CLOUDINARY_UPLOAD_TIMEOUT_MS).toBe(120_000)
    expect([...xhr.form.keys()].sort()).toEqual([
      'api_key',
      'file',
      'folder',
      'signature',
      'timestamp',
    ])
    expect(xhr.form.get('file')).toBe(file)
    expect(xhr.form.get('api_key')).toBe('mock-api-key')
    expect(xhr.form.get('folder')).toBe('galpon/productos')
    expect(xhr.form.get('timestamp')).toBe(String(Math.floor(TEST_NOW.getTime() / 1000)))
    expect(xhr.form.get('signature')).toMatch(/^mock-[0-9a-f]{40}$/)

    xhr.progress(25, 100)
    xhr.progress(100, 100)
    xhr.respond(200, CLOUDINARY_OK)

    await expect(upload).resolves.toEqual({
      publicId: CLOUDINARY_OK.public_id,
      url: CLOUDINARY_OK.secure_url,
      width: 1200,
      height: 1500,
    })
    // El 100 % llega con la respuesta, no al terminar de mandar los bytes.
    expect(progress).toEqual([25, 99, 100])
  })

  it('usa la carpeta de cada uso', async () => {
    const { uploader } = await setup()
    const upload = uploader.upload(photo(), { purpose: 'partner' })
    const xhr = await nextXhr()
    expect(xhr.form.get('folder')).toBe('galpon/socios')
    xhr.respond(200, CLOUDINARY_OK)
    await upload
  })

  it.each([400, 401, 500])(
    'un %i de Cloudinary rechaza la subida con el estado',
    async (status) => {
      const { uploader } = await setup()
      const upload = uploader.upload(photo(), { purpose: 'product' })
      const xhr = await nextXhr()
      xhr.respond(status, { error: { message: 'Invalid Signature' } })

      const error = await upload.catch((caught: unknown) => caught)
      expect(error).toBeInstanceOf(MediaUploadError)
      expect(error).toMatchObject({
        reason: 'rejected',
        status,
        message: `El servicio de fotos rechazó la subida (${String(status)}).`,
      })
    },
  )

  it('un 200 sin la foto en el cuerpo también es un rechazo', async () => {
    const { uploader } = await setup()
    const upload = uploader.upload(photo(), { purpose: 'product' })
    const xhr = await nextXhr()
    xhr.respond(200, 'no es JSON')
    await expect(upload).rejects.toMatchObject({ reason: 'rejected', status: 200 })
  })

  it('un corte de red rechaza con el motivo network', async () => {
    const { uploader } = await setup()
    const upload = uploader.upload(photo(), { purpose: 'product' })
    const xhr = await nextXhr()
    xhr.failNetwork()
    await expect(upload).rejects.toMatchObject({
      reason: 'network',
      status: null,
      message: 'No se pudo subir la foto: revisá la conexión.',
    })
  })

  it('una respuesta con estado 0 rechaza con el motivo network (no queda subiendo)', async () => {
    const { uploader } = await setup()
    const upload = uploader.upload(photo(), { purpose: 'product' })
    const xhr = await nextXhr()
    xhr.respond(0, '')
    await expect(upload).rejects.toMatchObject({
      reason: 'network',
      status: null,
      message: 'No se pudo subir la foto: revisá la conexión.',
    })
  })

  it('si pasa el tiempo máximo rechaza con el motivo timeout', async () => {
    const { uploader } = await setup()
    const upload = uploader.upload(photo(), { purpose: 'product' })
    const xhr = await nextXhr()
    xhr.expire()
    await expect(upload).rejects.toMatchObject({
      reason: 'timeout',
      message: 'La subida tardó demasiado.',
    })
  })

  it('cancelar aborta el XHR y rechaza con AbortError', async () => {
    const { uploader } = await setup()
    const controller = new AbortController()
    const upload = uploader.upload(photo(), { purpose: 'product', signal: controller.signal })
    const xhr = await nextXhr()
    controller.abort()
    expect(xhr.aborted).toBe(true)
    await expect(upload).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('cancelar mientras se pide la firma no llega a abrir el XHR', async () => {
    const { uploader } = await setup()
    const controller = new AbortController()
    const upload = uploader.upload(photo(), { purpose: 'product', signal: controller.signal })
    controller.abort()
    await expect(upload).rejects.toMatchObject({ name: 'AbortError' })
    expect(FakeXhr.instances).toHaveLength(0)
  })

  it('cada intento (también el reintento) pide una firma nueva', async () => {
    const { uploader } = await setup()
    const file = photo()
    const first = uploader.upload(file, { purpose: 'product' })
    const firstXhr = await nextXhr(0)
    firstXhr.failNetwork()
    await expect(first).rejects.toBeInstanceOf(MediaUploadError)

    const retry = uploader.upload(file, { purpose: 'product' })
    const retryXhr = await nextXhr(1)
    expect(retryXhr.form.get('signature')).not.toBe(firstXhr.form.get('signature'))
    retryXhr.respond(200, CLOUDINARY_OK)
    await expect(retry).resolves.toMatchObject({ publicId: CLOUDINARY_OK.public_id })
  })

  it('sin sesión, la firma da 401 y la subida rechaza con el motivo unauthorized', async () => {
    const { app, uploader } = await setup()
    app.mockDb.db.adminSession = null
    await expect(uploader.upload(photo(), { purpose: 'product' })).rejects.toMatchObject({
      reason: 'unauthorized',
      status: 401,
      message: 'Tu sesión venció: ingresá de nuevo y reintentá.',
    })
    expect(FakeXhr.instances).toHaveLength(0)
  })

  it('rechaza un uso de foto que no existe', async () => {
    const { uploader } = await setup()
    // @ts-expect-error -- un uso inválido, como el que podría llegar sin tipos.
    await expect(uploader.upload(photo(), { purpose: 'banner' })).rejects.toThrow(RangeError)
  })
})
