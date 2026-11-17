import { revalidateTag } from 'next/cache'
import { getStoreEnv } from '@/lib/env'
import {
  isValidRevalidateSecret,
  REVALIDATE_TAG_PATTERN,
  revalidationProfileFor,
} from '@/lib/revalidate'

/** Máximo de etiquetas por pedido: sobra para un cambio real y corta los pedidos desmedidos. */
const MAX_TAGS = 50

/** Tamaño máximo del cuerpo, en bytes: 50 etiquetas de 100 caracteres entran con holgura. */
const MAX_BODY_BYTES = 8 * 1024

/** Respuesta de error en JSON, con el estado indicado. */
function failure(status: number, error: string): Response {
  return Response.json({ error }, { status })
}

/**
 * Lee el cuerpo como texto sin pasar de `limit` bytes: corta antes de leerlo si `Content-Length`
 * ya lo pasa y, si no viene (cuerpo en pedazos), en cuanto lo leído lo pasa.
 *
 * @returns El texto, o `null` si el cuerpo pasa el límite.
 */
async function readBodyUpTo(request: Request, limit: number): Promise<string | null> {
  const declared = Number(request.headers.get('content-length') ?? '0')
  if (declared > limit) return null
  if (request.body === null) return ''
  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let size = 0
  let text = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return text + decoder.decode()
    size += value.byteLength
    if (size > limit) {
      await reader.cancel()
      return null
    }
    text += decoder.decode(value, { stream: true })
  }
}

/** Las etiquetas del cuerpo, sin repetidas, o el motivo por el que no sirven. */
function parseTags(body: unknown): string[] | string {
  const tags: unknown =
    typeof body === 'object' && body !== null && 'tags' in body ? body.tags : undefined
  if (!Array.isArray(tags) || tags.length === 0 || tags.length > MAX_TAGS) {
    return `tags tiene que ser una lista de 1 a ${String(MAX_TAGS)} etiquetas.`
  }
  const unique = new Set<string>()
  for (const tag of tags as unknown[]) {
    if (typeof tag !== 'string' || !REVALIDATE_TAG_PATTERN.test(tag)) {
      return `La etiqueta ${JSON.stringify(tag)} no es válida.`
    }
    unique.add(tag)
  }
  return [...unique]
}

/**
 * El backend avisa qué etiquetas de caché regenerar: `POST { tags: string[] }` con el secreto en
 * `x-revalidate-secret`. Secreto inválido: 401. Cuerpo de más de 8 kB: 413. Cuerpo o etiquetas
 * inválidos (más de 50, o alguna que no es de la tienda o pasa los 100 caracteres): 422. Si todo
 * está bien, regenera cada etiqueta y responde 200 con `{ revalidated: tags }`.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = request.headers.get('x-revalidate-secret')
  if (!isValidRevalidateSecret(secret, getStoreEnv().revalidateSecret)) {
    return failure(401, 'El secreto de revalidación no es válido.')
  }
  const text = await readBodyUpTo(request, MAX_BODY_BYTES)
  if (text === null) {
    return failure(413, `El cuerpo del pedido pasa los ${String(MAX_BODY_BYTES)} bytes.`)
  }
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return failure(422, 'El cuerpo del pedido no es un JSON válido.')
  }
  const tags = parseTags(body)
  if (typeof tags === 'string') return failure(422, tags)
  for (const tag of tags) revalidateTag(tag, revalidationProfileFor(tag))
  return Response.json({ revalidated: tags })
}
