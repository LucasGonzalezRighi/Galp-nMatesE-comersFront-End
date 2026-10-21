import { revalidateTag } from 'next/cache'
import { getStoreEnv } from '@/lib/env'
import {
  isValidRevalidateSecret,
  REVALIDATE_TAG_PATTERN,
  revalidationProfileFor,
} from '@/lib/revalidate'

/** Máximo de etiquetas por pedido: sobra para un cambio real y corta los pedidos desmedidos. */
const MAX_TAGS = 50

/** Respuesta de error en JSON, con el estado indicado. */
function failure(status: number, error: string): Response {
  return Response.json({ error }, { status })
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
 * `x-revalidate-secret`. Secreto inválido: 401. Cuerpo o etiquetas inválidos: 422. Si todo está
 * bien, regenera cada etiqueta y responde 200 con `{ revalidated: tags }`.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = request.headers.get('x-revalidate-secret')
  if (!isValidRevalidateSecret(secret, getStoreEnv().revalidateSecret)) {
    return failure(401, 'El secreto de revalidación no es válido.')
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return failure(422, 'El cuerpo del pedido no es un JSON válido.')
  }
  const tags = parseTags(body)
  if (typeof tags === 'string') return failure(422, tags)
  for (const tag of tags) revalidateTag(tag, revalidationProfileFor(tag))
  return Response.json({ revalidated: tags })
}
