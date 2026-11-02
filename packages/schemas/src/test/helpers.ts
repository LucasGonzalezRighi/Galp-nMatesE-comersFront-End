import type { z } from 'zod'

/** Camino y mensaje de un error de Zod, tal como los comparan los tests. */
export interface IssueSummary {
  message: string
  path: PropertyKey[]
}

/**
 * Camino y mensaje de cada error que da un schema para una entrada.
 *
 * @param schema - Schema que se prueba.
 * @param input - Entrada a validar.
 * @returns Los errores en el orden que los da Zod; vacío si la entrada es válida.
 */
export function issuesOf(schema: z.ZodType, input: unknown): IssueSummary[] {
  const result = schema.safeParse(input)
  return result.success ? [] : result.error.issues.map(({ message, path }) => ({ message, path }))
}

/**
 * Mensajes de todos los errores que da un schema para una entrada.
 *
 * @param schema - Schema que se prueba.
 * @param input - Entrada a validar.
 * @returns Los mensajes en el orden que los da Zod; vacío si la entrada es válida.
 */
export function messagesOf(schema: z.ZodType, input: unknown): string[] {
  return issuesOf(schema, input).map((issue) => issue.message)
}
