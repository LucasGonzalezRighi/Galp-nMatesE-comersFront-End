import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import * as schemas from './index'

/**
 * Un caso de `docs/api/validation-cases.json`.
 *
 * El archivo es la fuente: estos tests lo corren contra los schemas reales y el back (NestJS)
 * va a correr los mismos casos contra sus DTOs.
 */
interface ValidationCase {
  /** Campo o regla que se prueba (`Email`, `Teléfono`...); cada uno tiene al menos tres casos. */
  field: string
  /** `<campo>: <qué se prueba>`; es único y es el título del test. */
  name: string
  /** Nombre del schema exportado por `@galpon/schemas`, por ejemplo `contactSchema`. */
  schema: string
  /** Lo que llega, tal cual lo escribe la persona (sin normalizar). */
  input: unknown
  /** Si los datos tienen que pasar la validación. */
  valid: boolean
  /** Solo en los válidos: el resultado ya normalizado (si falta, no se compara). */
  output?: unknown
  /**
   * Solo en los inválidos: el mensaje de cada campo con error, con el camino unido por puntos
   * (`address.street`). `null` en vez del mensaje: tiene que fallar ese campo pero el texto no
   * está fijado (por ejemplo, el campo trampa que se descarta en silencio).
   */
  errors?: Record<string, string | null>
}

/** Forma del archivo de casos. */
interface ValidationCasesFile {
  description: string
  cases: ValidationCase[]
}

/** Casos del archivo compartido con el back; el JSON es la fuente, estos tests solo lo corren. */
const { cases } = JSON.parse(
  readFileSync(new URL('../../../docs/api/validation-cases.json', import.meta.url), 'utf8'),
) as ValidationCasesFile

/** Devuelve el schema exportado con ese nombre. */
function schemaNamed(name: string): z.ZodType {
  const candidate = (schemas as Record<string, unknown>)[name]
  if (!(candidate instanceof z.ZodType)) {
    throw new Error(`"${name}" no es un schema exportado por @galpon/schemas`)
  }
  return candidate
}

describe('docs/api/validation-cases.json', () => {
  it('tiene casos, con nombres únicos', () => {
    expect(cases.length).toBeGreaterThan(100)
    const names = cases.map((validationCase) => validationCase.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('cada caso nombra un schema que existe y trae lo que le corresponde', () => {
    for (const validationCase of cases) {
      expect(() => schemaNamed(validationCase.schema), validationCase.name).not.toThrow()
      if (validationCase.valid) {
        expect(validationCase.errors, validationCase.name).toBeUndefined()
      } else {
        expect(validationCase.output, validationCase.name).toBeUndefined()
        expect(Object.keys(validationCase.errors ?? {}), validationCase.name).not.toHaveLength(0)
      }
    }
  })

  it('cada campo tiene al menos tres casos: uno válido y uno inválido (con su mensaje) como mínimo', () => {
    const byField = new Map<string, ValidationCase[]>()
    for (const validationCase of cases) {
      const { field } = validationCase
      byField.set(field, [...(byField.get(field) ?? []), validationCase])
    }
    expect(byField.size).toBeGreaterThanOrEqual(30)
    for (const [field, fieldCases] of byField) {
      expect(fieldCases.length, `${field}: casos`).toBeGreaterThanOrEqual(3)
      expect(
        fieldCases.some((validationCase) => validationCase.valid),
        `${field}: algún caso válido`,
      ).toBe(true)
      expect(
        fieldCases.some((validationCase) => !validationCase.valid),
        `${field}: algún caso inválido`,
      ).toBe(true)
    }
  })
})

describe('casos de validación compartidos con el back', () => {
  it.each(cases.map((validationCase) => [validationCase.name, validationCase] as const))(
    '%s',
    (_name, validationCase) => {
      const result = schemaNamed(validationCase.schema).safeParse(validationCase.input)

      if (validationCase.valid) {
        expect(
          result.success ? {} : schemas.toFieldErrors(result.error),
          'los datos tendrían que ser válidos',
        ).toEqual({})
        if (validationCase.output !== undefined && result.success) {
          expect(result.data).toEqual(validationCase.output)
        }
        return
      }

      expect(result.success, 'los datos tendrían que ser inválidos').toBe(false)
      if (result.success) return
      const actual = schemas.toFieldErrors(result.error)
      const expected = validationCase.errors ?? {}
      // Los mismos campos con error, ni uno más ni uno menos.
      expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort())
      for (const [field, message] of Object.entries(expected)) {
        if (message !== null) expect(actual[field], field).toBe(message)
      }
    },
  )
})
