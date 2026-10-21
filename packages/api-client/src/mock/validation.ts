import type { z } from 'zod'
import type { FieldError } from '../generated/schema'
import { ResponseError, validationProblem } from './http'

/** Formato de los slugs del contrato (`mate-imperial-premium`). */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Largo máximo de un slug en el contrato. */
const SLUG_MAX_LENGTH = 80

/**
 * Convierte los errores de Zod en los errores por campo del contrato (el primero de cada campo).
 *
 * @param error - Error que devuelve `safeParse`.
 */
export function zodFieldErrors(error: z.ZodError): FieldError[] {
  const seen = new Set<string>()
  const errors: FieldError[] = []
  for (const issue of error.issues) {
    const field = issue.path.map(String).join('.')
    if (seen.has(field)) continue
    seen.add(field)
    errors.push({ field, code: issue.code, message: issue.message })
  }
  return errors
}

/**
 * Indica si un texto sirve como slug del contrato.
 *
 * @param slug - Texto a revisar.
 */
export function isSlug(slug: string): boolean {
  return slug.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(slug)
}

/**
 * Devuelve el slug de la ruta (`{slug}`) si tiene el formato del contrato.
 *
 * @param params - Parámetros de la ruta.
 * @throws {ResponseError} Con un `422` si el slug no tiene formato.
 */
export function slugParam(params: Readonly<Record<string, string>>): string {
  const slug = params.slug ?? ''
  if (!isSlug(slug)) {
    throw new ResponseError(
      validationProblem([
        {
          field: 'slug',
          code: 'invalid_format',
          message: 'El slug solo puede tener minúsculas, números y guiones, y hasta 80 caracteres.',
        },
      ]),
    )
  }
  return slug
}

/**
 * Lee y valida los parámetros de búsqueda de un pedido, acumulando un error por campo.
 *
 * Cada método devuelve el valor ya convertido, o `undefined` si el parámetro falta, está vacío o
 * no sirve (en ese caso anota el error). Al final, {@link QueryReader.assertValid} responde `422`
 * con todos los errores juntos, en el orden en que se pidieron los campos.
 */
export class QueryReader {
  private readonly errors: FieldError[] = []

  /**
   * @param query - Parámetros de búsqueda de la URL.
   */
  constructor(private readonly query: URLSearchParams) {}

  /** Valor del parámetro, o `undefined` si falta o está vacío. */
  private raw(name: string): string | undefined {
    const value = this.query.get(name)
    return value === null || value === '' ? undefined : value
  }

  /** Anota el error de un campo. */
  private fail(field: string, code: string, message: string): void {
    this.errors.push({ field, code, message })
  }

  /**
   * Lee un entero dentro de un rango.
   *
   * @param name - Nombre del parámetro.
   * @param label - Cómo se llama en los mensajes ("La página").
   * @param range - Mínimo y, si hay, máximo.
   * @param fallback - Valor cuando el parámetro falta.
   */
  integer(
    name: string,
    label: string,
    range: { min: number; max?: number },
    fallback: number,
  ): number {
    const raw = this.raw(name)
    if (raw === undefined) return fallback
    const value = Number(raw)
    if (!/^-?\d+$/.test(raw) || !Number.isSafeInteger(value)) {
      this.fail(name, 'invalid_type', `${label} tiene que ser un número entero.`)
      return fallback
    }
    if (value < range.min) {
      this.fail(name, 'too_small', `${label} tiene que ser mayor o igual a ${String(range.min)}.`)
      return fallback
    }
    if (range.max !== undefined && value > range.max) {
      this.fail(name, 'too_big', `${label} no puede pasar de ${String(range.max)}.`)
      return fallback
    }
    return value
  }

  /**
   * Lee un valor de una lista cerrada.
   *
   * @param name - Nombre del parámetro.
   * @param label - Cómo se llama en los mensajes ("El grupo").
   * @param values - Valores permitidos.
   */
  oneOf<T extends string>(name: string, label: string, values: readonly T[]): T | undefined {
    const raw = this.raw(name)
    if (raw === undefined) return undefined
    const match = values.find((value) => value === raw)
    if (match === undefined) {
      this.fail(name, 'invalid_value', `${label} tiene que ser ${values.join(', ')}.`)
    }
    return match
  }

  /**
   * Lee un booleano escrito como `true` o `false`.
   *
   * @param name - Nombre del parámetro.
   */
  boolean(name: string): boolean | undefined {
    const raw = this.raw(name)
    if (raw === undefined) return undefined
    if (raw === 'true') return true
    if (raw === 'false') return false
    this.fail(name, 'invalid_type', `El valor de ${name} tiene que ser true o false.`)
    return undefined
  }

  /**
   * Lee un texto libre con largo máximo.
   *
   * @param name - Nombre del parámetro.
   * @param maxLength - Largo máximo en caracteres.
   */
  text(name: string, maxLength: number): string | undefined {
    const raw = this.raw(name)
    if (raw === undefined) return undefined
    if (raw.length > maxLength) {
      this.fail(name, 'too_big', `El texto no puede pasar de ${String(maxLength)} caracteres.`)
      return undefined
    }
    return raw
  }

  /**
   * Lee un slug de línea.
   *
   * @param name - Nombre del parámetro.
   */
  slug(name: string): string | undefined {
    const raw = this.raw(name)
    if (raw === undefined) return undefined
    if (!isSlug(raw)) {
      this.fail(
        name,
        'invalid_format',
        'El slug solo puede tener minúsculas, números y guiones, y hasta 80 caracteres.',
      )
      return undefined
    }
    return raw
  }

  /**
   * Responde `422` si algún parámetro no sirvió.
   *
   * @throws {ResponseError} Con los errores de todos los campos.
   */
  assertValid(): void {
    if (this.errors.length > 0) throw new ResponseError(validationProblem(this.errors))
  }
}
