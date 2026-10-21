import type { z } from 'zod'
import type { MockContext } from '../router'
import { ResponseError, validationProblem } from '../http'
import { zodFieldErrors } from '../validation'

/**
 * Resultado de leer un formulario público: o el campo trampa vino lleno y hay que descartarlo
 * en silencio, o son los datos ya validados y normalizados.
 */
export type PublicForm<T> = { trapped: true } | { trapped: false; data: T }

/** Indica si un valor del cuerpo es un objeto (no una lista ni `null`). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Quita los campos en `null`. El contrato manda `null` en los opcionales (`authorName`,
 * `orderNumber`, `comment`, `website`), pero los schemas del formulario esperan que falten.
 */
function withoutNulls(body: unknown): unknown {
  if (!isRecord(body)) return body
  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== null))
}

/**
 * Lee el cuerpo de un formulario público (reseña, contacto o arrepentimiento) y lo valida.
 *
 * Mira primero el campo trampa `website`: si llegó con texto es un bot, y el contrato pide
 * responder como si hubiera funcionado sin explicar qué falló, así que ni siquiera se valida el
 * resto. Si no, valida con el schema y devuelve los datos normalizados (nombre recortado, email
 * en minúsculas, "Anónimo" si falta el nombre…).
 *
 * @param ctx - Contexto del pedido.
 * @param schema - Schema del formulario, de `@galpon/schemas`.
 * @returns El campo trampa lleno (`trapped: true`) o los datos validados.
 * @throws {ResponseError} Con un `422` si el cuerpo no es JSON o algún campo no es válido, con
 *   un error en español por campo.
 */
export async function readPublicForm<S extends z.ZodType>(
  ctx: MockContext,
  schema: S,
): Promise<PublicForm<z.output<S>>> {
  const body = withoutNulls(await ctx.body<unknown>())
  if (isRecord(body) && typeof body.website === 'string' && body.website !== '') {
    return { trapped: true }
  }
  const result = schema.safeParse(body)
  if (!result.success) throw new ResponseError(validationProblem(zodFieldErrors(result.error)))
  return { trapped: false, data: result.data }
}
