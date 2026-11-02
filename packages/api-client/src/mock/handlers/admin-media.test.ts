import { describe, expect, it } from 'vitest'
import type { Image } from '../../generated/schema'
import { createMediaSignature } from '../../services'
import { createMockApi, loginAsAdmin, MOCK_ORIGIN, rawRequest } from '../../test/mock-api'
import { MOCK_MEDIA_PATH, postMockMedia } from './admin-media'

const NOW = new Date('2026-10-27T15:00:00Z')

/** URL base de la API simulada para {@link postMockMedia}. */
const BASE_URL = `${MOCK_ORIGIN}/api/v1`

/** Foto reducida válida, como la manda el dashboard. */
const UPLOAD = {
  folder: 'galpon/productos',
  dataUrl: 'data:image/webp;base64,UklGRg==',
  width: 1200,
  height: 1600,
}

/** API simulada con la sesión del admin iniciada y el reloj fijo. */
async function adminApi() {
  const mock = createMockApi({ now: () => NOW })
  await loginAsAdmin(mock)
  return mock
}

/** Foto de la base simulada con el `publicId` dado. */
function image(publicId: string): Image {
  return { publicId, url: 'data:image/webp;base64,AA==', width: 900, height: 900, alt: 'Foto' }
}

describe('POST /admin/media/signature', () => {
  it('firma la subida en la carpeta del uso, con la hora en segundos', async () => {
    const mock = await adminApi()
    await expect(createMediaSignature(mock.api, 'category')).resolves.toEqual({
      timestamp: NOW.getTime() / 1000,
      signature: expect.stringMatching(/^mock-[0-9a-f]{40}$/) as unknown,
      apiKey: 'mock-api-key',
      cloudName: 'galpon-mock',
      folder: 'galpon/lineas',
    })
    expect((await createMediaSignature(mock.api, 'partner')).folder).toBe('galpon/socios')
  })

  it('responde 422 si el uso no es uno de los del contrato', async () => {
    const mock = await adminApi()
    const csrfToken = mock.db.adminSession?.csrfToken ?? ''
    const response = await rawRequest(mock, '/admin/media/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ purpose: 'otro' }),
    })
    expect(response.status).toBe(422)
  })

  it('el servicio no manda un uso inválido', () => {
    expect(() => createMediaSignature(createMockApi().api, 'otro' as 'product')).toThrow(RangeError)
  })
})

describe('POST /__mock/media', () => {
  it('guarda la foto reducida y responde 201 con el publicId y el data URL', async () => {
    const mock = await adminApi()
    const result = await postMockMedia(mock.fetch, BASE_URL, UPLOAD)
    expect(result).toEqual({
      publicId: expect.stringMatching(/^galpon\/productos\/mock-[0-9a-f-]{36}$/) as unknown,
      url: UPLOAD.dataUrl,
    })
    expect(mock.db.media[result.publicId]).toEqual({
      url: UPLOAD.dataUrl,
      width: 1200,
      height: 1600,
      createdAt: NOW.toISOString(),
    })
    const response = await rawRequest(mock, MOCK_MEDIA_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(UPLOAD),
    })
    expect(response.status).toBe(201)
  })

  it('sin sesión de admin responde 401', async () => {
    const mock = createMockApi()
    await expect(postMockMedia(mock.fetch, BASE_URL, UPLOAD)).rejects.toMatchObject({
      status: 401,
    })
    expect(mock.db.media).toEqual({})
  })

  it('acepta un data URL de 200 000 caracteres y rechaza uno más largo', async () => {
    const mock = await adminApi()
    const prefix = 'data:image/jpeg;base64,'
    const longest = prefix + 'A'.repeat(200_000 - prefix.length)
    await expect(
      postMockMedia(mock.fetch, BASE_URL, { ...UPLOAD, dataUrl: longest }),
    ).resolves.toMatchObject({ url: longest })
    await expect(
      postMockMedia(mock.fetch, BASE_URL, { ...UPLOAD, dataUrl: `${longest}A` }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { dataUrl: 'La foto simulada es demasiado grande' },
    })
  })

  it.each([
    ['un data URL de otro formato', { dataUrl: 'data:image/gif;base64,R0lGOD==' }],
    ['una dirección que no es un data URL', { dataUrl: 'https://ejemplo.com/foto.jpg' }],
    ['una carpeta que no es de las fotos', { folder: 'galpon/otra' }],
    ['medidas que no son enteros positivos', { width: 0, height: 1.5 }],
  ])('responde 422 con %s', async (_description, change) => {
    const mock = await adminApi()
    await expect(
      postMockMedia(mock.fetch, BASE_URL, { ...UPLOAD, ...change }),
    ).rejects.toMatchObject({ status: 422 })
    expect(mock.db.media).toEqual({})
  })

  it('pasadas las 40 fotos borra las más viejas que no usa un producto, una línea ni un socio', async () => {
    const mock = await adminApi()
    for (let index = 0; index < 40; index += 1) {
      mock.db.media[`galpon/productos/mock-${String(index)}`] = {
        url: 'data:image/webp;base64,AA==',
        width: 900,
        height: 900,
        createdAt: new Date(NOW.getTime() - (40 - index) * 60_000).toISOString(),
      }
    }
    const [product] = mock.db.products
    const [category] = mock.db.categories
    const [partner] = mock.db.content.about.partners
    if (product === undefined || category === undefined || partner === undefined) {
      throw new Error('Faltan datos de fábrica')
    }
    product.images.push(image('galpon/productos/mock-0'))
    category.image = image('galpon/productos/mock-1')
    partner.photo = image('galpon/productos/mock-2')

    const first = await postMockMedia(mock.fetch, BASE_URL, UPLOAD)
    const second = await postMockMedia(mock.fetch, BASE_URL, UPLOAD)

    const kept = Object.keys(mock.db.media)
    expect(kept).toHaveLength(40)
    expect(kept).toEqual(
      expect.arrayContaining([
        'galpon/productos/mock-0',
        'galpon/productos/mock-1',
        'galpon/productos/mock-2',
        'galpon/productos/mock-5',
        first.publicId,
        second.publicId,
      ]),
    )
    expect(kept).not.toContain('galpon/productos/mock-3')
    expect(kept).not.toContain('galpon/productos/mock-4')
  })

  it('postMockMedia no acepta una URL base vacía', async () => {
    await expect(postMockMedia(createMockApi().fetch, ' ', UPLOAD)).rejects.toThrow(RangeError)
  })
})
