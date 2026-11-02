import { z } from 'zod'
import { MEDIA_FOLDERS } from '@galpon/domain'
import { mediaSignatureSchema } from '@galpon/schemas'
import type { ApiFetch } from '../../client'
import type { MediaSignature } from '../../generated/schema'
import type { MockRoute } from '../router'
import type { MockDb } from '../types'
import { apiErrorFromResponse } from '../../errors'
import { json } from '../http'
import { route } from '../router'
import { randomUuid } from '../uuid'
import { parseOrFail } from '../validation'
import { requireAdmin } from './admin-auth'

/**
 * Ruta interna que guarda una foto subida en el modo de prueba, relativa al prefijo de la API
 * (`/api/v1`). No está en el contrato: reemplaza la subida a Cloudinary con un data URL reducido
 * que se guarda en la base simulada (`db.media`).
 */
export const MOCK_MEDIA_PATH = '/__mock/media'

/** Máximo de caracteres del data URL de una foto simulada. */
export const MAX_MOCK_MEDIA_LENGTH = 200_000

/** Cuántas fotos simuladas se guardan; pasado el cupo se borran las más viejas sin usar. */
export const MAX_MOCK_MEDIA = 40

/** Comienzos válidos del data URL: WebP, JPEG o PNG en base 64. */
const DATA_URL_PREFIXES = [
  'data:image/webp;base64,',
  'data:image/jpeg;base64,',
  'data:image/png;base64,',
] as const

/** Mensaje de las medidas que no son enteros positivos. */
const DIMENSION_MESSAGE = 'Las medidas de la foto tienen que ser enteros mayores a 0.'

/** Cuerpo de {@link MOCK_MEDIA_PATH}. */
const mockMediaSchema = z.strictObject({
  folder: z.enum(MEDIA_FOLDERS, { error: 'La carpeta tiene que ser una de las de las fotos.' }),
  dataUrl: z
    .string({ error: 'Mandá la foto como data URL.' })
    .max(MAX_MOCK_MEDIA_LENGTH, 'La foto simulada es demasiado grande')
    .refine(
      (dataUrl) => DATA_URL_PREFIXES.some((prefix) => dataUrl.startsWith(prefix)),
      'La foto simulada tiene que ser un data URL de WebP, JPEG o PNG.',
    ),
  width: z.int({ error: DIMENSION_MESSAGE }).positive(DIMENSION_MESSAGE),
  height: z.int({ error: DIMENSION_MESSAGE }).positive(DIMENSION_MESSAGE),
})

/** Foto reducida que el dashboard registra en el modo de prueba. */
export interface MockMediaInput {
  /** Carpeta de la foto: una de `MEDIA_FOLDERS` de `@galpon/domain` (`galpon/productos`…). */
  folder: string
  /** Foto reducida como data URL de WebP, JPEG o PNG, de hasta 200 000 caracteres. */
  dataUrl: string
  /** Ancho en píxeles de la foto original. */
  width: number
  /** Alto en píxeles de la foto original. */
  height: number
}

/** Respuesta de {@link MOCK_MEDIA_PATH}: la foto registrada. */
export interface MockMediaResult {
  /** Identificador de la foto, `{carpeta}/mock-{uuid}`; es el que se guarda en el producto. */
  publicId: string
  /** El mismo data URL, para mostrar la foto. */
  url: string
}

/** `publicId` de las fotos que usa algún producto, línea o socio. */
function usedPublicIds(db: MockDb): Set<string> {
  return new Set([
    ...db.products.flatMap((product) => product.images.map((image) => image.publicId)),
    ...db.categories.flatMap((category) =>
      category.image === null ? [] : [category.image.publicId],
    ),
    ...db.content.about.partners.flatMap((partner) =>
      partner.photo === null ? [] : [partner.photo.publicId],
    ),
  ])
}

/**
 * Si hay más de {@link MAX_MOCK_MEDIA} fotos simuladas, borra las más viejas que no usa ningún
 * producto, línea ni socio, para que la base entre en `sessionStorage`.
 *
 * @param db - Base simulada.
 * @param keep - Foto recién subida, que nunca se borra.
 */
function pruneMedia(db: MockDb, keep: string): void {
  const entries = Object.entries(db.media)
  const excess = entries.length - MAX_MOCK_MEDIA
  if (excess <= 0) return
  const used = usedPublicIds(db)
  const removed = new Set(
    entries
      .filter(([publicId]) => publicId !== keep && !used.has(publicId))
      .sort(([, a], [, b]) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
      .slice(0, excess)
      .map(([publicId]) => publicId),
  )
  db.media = Object.fromEntries(entries.filter(([publicId]) => !removed.has(publicId)))
}

/** 40 dígitos hexadecimales al azar, como una firma SHA-1 (sirve también fuera de HTTPS). */
function randomHex40(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Rutas del dashboard para las fotos: la firma de la subida a Cloudinary. En el modo de prueba
 * la firma es falsa (`mock-…`) y la subida la reemplaza {@link MOCK_MEDIA_ROUTE}.
 */
export const adminMediaRoutes: readonly MockRoute[] = [
  route('POST', '/admin/media/signature', async (ctx) => {
    requireAdmin(ctx, { csrf: true })
    const { purpose } = parseOrFail(mediaSignatureSchema, await ctx.body())
    const signature: MediaSignature = {
      timestamp: Math.floor(ctx.now.getTime() / 1000),
      signature: `mock-${randomHex40()}`,
      apiKey: 'mock-api-key',
      cloudName: 'galpon-mock',
      folder: MEDIA_FOLDERS[purpose],
    }
    return json(signature)
  }),
]

/**
 * `POST /__mock/media` con `{ folder, dataUrl, width, height }`: exige la sesión del admin (sin
 * token CSRF), guarda la foto en `db.media` con `publicId` `{folder}/mock-{uuid}` y responde
 * `201 { publicId, url }`; `422` si la carpeta no es de las fotos o el data URL no es de WebP,
 * JPEG o PNG o pasa de 200 000 caracteres. Pasadas las 40 fotos borra las más viejas sin usar.
 */
export const MOCK_MEDIA_ROUTE: MockRoute = {
  method: 'POST',
  path: MOCK_MEDIA_PATH,
  handler: async (ctx) => {
    requireAdmin(ctx, { csrf: false })
    const input = parseOrFail(mockMediaSchema, await ctx.body())
    const publicId = `${input.folder}/mock-${randomUuid()}`
    ctx.db.media[publicId] = {
      url: input.dataUrl,
      width: input.width,
      height: input.height,
      createdAt: ctx.now.toISOString(),
    }
    pruneMedia(ctx.db, publicId)
    const result: MockMediaResult = { publicId, url: input.dataUrl }
    return json(result, 201)
  },
}

/**
 * Registra una foto reducida en la API simulada (`POST /__mock/media`) por su `fetch` en memoria.
 * Es lo que hace el dashboard en el modo de prueba en lugar de subir la foto a Cloudinary.
 *
 * @param fetch - El `fetch` simulado (`createMockFetch`), con la sesión del admin abierta.
 * @param baseUrl - URL base de la API, por ejemplo `http://mock.invalid/api/v1`.
 * @param input - Carpeta, data URL reducido y medidas de la foto original.
 * @returns El `publicId` y la `url` de la foto.
 * @throws {RangeError} Si `baseUrl` está vacía.
 * @throws {ApiError} Con `unauthorized` sin sesión del admin y `validation` si la carpeta, el data
 *   URL o las medidas no sirven.
 */
export async function postMockMedia(
  fetch: ApiFetch,
  baseUrl: string,
  input: MockMediaInput,
): Promise<MockMediaResult> {
  if (baseUrl.trim() === '') {
    throw new RangeError('La URL base de la API simulada no puede estar vacía.')
  }
  const response = await fetch(
    new Request(`${baseUrl.replace(/\/+$/, '')}${MOCK_MEDIA_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  )
  const body: unknown = await response.json()
  if (!response.ok) throw apiErrorFromResponse(response, body)
  // El fetch es la API simulada, que responde con MockMediaResult.
  return body as MockMediaResult
}
