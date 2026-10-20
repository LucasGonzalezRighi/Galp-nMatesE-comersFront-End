import type { z } from 'zod'
import { describe, expect, it } from 'vitest'
import { PROVINCES } from '@galpon/domain'
import {
  apartmentSchema,
  citySchema,
  dniSchema,
  emailSchema,
  honeypotSchema,
  optionalPhoneSchema,
  orderNumberSchema,
  personNameSchema,
  postalCodeSchema,
  provinceSchema,
  quantitySchema,
  streetNumberSchema,
  streetSchema,
} from './fields'
import { MESSAGES } from './messages'

/** Mensajes de todos los errores que da un schema para una entrada (vacío si es válida). */
function errorsOf(schema: z.ZodType, input: unknown): string[] {
  const result = schema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe('MESSAGES', () => {
  it('arma el máximo con el número que se le pasa', () => {
    expect(MESSAGES.max(50)).toBe('Máximo 50 caracteres')
    expect(MESSAGES.max(2000)).toBe('Máximo 2000 caracteres')
  })

  it('tiene los textos de la sección 15 del spec que ningún schema de checkout usa todavía', () => {
    expect(MESSAGES.minLetters).toBe('Ingresá al menos 2 letras')
    expect(MESSAGES.incompleteCardNumber).toBe('Número incompleto')
    expect(MESSAGES.invalidCardExpiry).toBe('Vencimiento inválido')
    expect(MESSAGES.invalidCardCvc).toBe('CVC inválido')
    expect(MESSAGES.reviewRating).toBe('Elegí una puntuación de 1 a 5 estrellas.')
    expect(MESSAGES.reviewText).toBe('Contanos un poco más (mínimo 10 caracteres)')
    expect(MESSAGES.contactName).toBe('Contanos tu nombre')
    expect(MESSAGES.contactMessage).toBe('Escribí al menos 10 caracteres')
    expect(MESSAGES.weakPassword).toBe('Mínimo 10 caracteres, con letras y números')
    expect(MESSAGES.passwordMismatch).toBe('Las contraseñas no coinciden')
    expect(MESSAGES.invalidSlug).toBe('Solo minúsculas, números y guiones')
    expect(MESSAGES.invalidCuit).toBe('CUIT inválido')
  })
})

describe('emailSchema', () => {
  it('recorta los espacios y pasa a minúsculas', () => {
    expect(emailSchema.parse(' Vos@Ejemplo.com ')).toBe('vos@ejemplo.com')
  })

  it.each(['vos@', 'sin-arroba', 'vos@ejemplo', '', '   '])('rechaza %j', (input) => {
    expect(errorsOf(emailSchema, input)).toEqual(['Ingresá un email válido'])
  })

  it('rechaza un email que falta', () => {
    expect(errorsOf(emailSchema, undefined)).toEqual(['Ingresá un email válido'])
  })

  it('acepta hasta 254 caracteres y rechaza uno más', () => {
    const domain = '@ejemplo.com'
    expect(emailSchema.safeParse('a'.repeat(254 - domain.length) + domain).success).toBe(true)
    expect(errorsOf(emailSchema, 'a'.repeat(255 - domain.length) + domain)).toEqual([
      'Ingresá un email válido',
    ])
  })
})

describe('personNameSchema', () => {
  it.each(['Lucía', "O'Connor", 'O’Connor', 'María-José', 'Ana María', 'Ñandú', 'Zoë'])(
    'acepta %j',
    (input) => {
      expect(personNameSchema.parse(input)).toBe(input)
    },
  )

  it('acepta una letra con tilde escrita con su marca combinada', () => {
    const decomposed = 'Luciá'
    expect(personNameSchema.parse(decomposed)).toBe(decomposed)
  })

  it('recorta los espacios', () => {
    expect(personNameSchema.parse('  Lucía  ')).toBe('Lucía')
  })

  it.each(['', '   '])('pide el dato si viene vacío (%j)', (input) => {
    expect(errorsOf(personNameSchema, input)).toEqual(['Requerido'])
  })

  it('pide el dato si falta', () => {
    expect(errorsOf(personNameSchema, undefined)).toEqual(['Requerido'])
  })

  it('pide al menos 2 letras', () => {
    expect(errorsOf(personNameSchema, 'A')).toEqual(['Ingresá al menos 2 letras'])
    expect(personNameSchema.safeParse('Al').success).toBe(true)
  })

  it.each(['R2D2', 'Ana_Maria', '-Ana', "'Ana", 'Ana!'])('rechaza %j: solo letras', (input) => {
    expect(errorsOf(personNameSchema, input)).toEqual(['Usá solo letras'])
  })

  it('acepta hasta 50 letras y rechaza una más', () => {
    expect(personNameSchema.safeParse('a'.repeat(50)).success).toBe(true)
    expect(errorsOf(personNameSchema, 'a'.repeat(51))).toEqual(['Máximo 50 caracteres'])
  })
})

describe('optionalPhoneSchema', () => {
  it.each([undefined, '', '   '])('lo deja en undefined si no se completa (%j)', (input) => {
    expect(optionalPhoneSchema.parse(input)).toBeUndefined()
  })

  it.each([
    ['11 2345-6789', '1123456789'],
    ['1123456789', '1123456789'],
    ['(11) 2345-6789', '1123456789'],
    ['+54 9 11 2345 6789', '1123456789'],
    ['+54 11 2345 6789', '1123456789'],
    ['54 9 11 2345 6789', '1123456789'],
    ['  351 123 4567  ', '3511234567'],
  ])('normaliza %j a %j', (input, expected) => {
    expect(optionalPhoneSchema.parse(input)).toBe(expected)
  })

  it.each([
    '011 2345 6789',
    '11 15 2345 6789',
    '011 15 2345 6789',
    '+54 9 011 2345 6789',
    '0123456789',
    '2345 6789',
    '11 2345 67890',
    'abc',
  ])('rechaza %j', (input) => {
    expect(errorsOf(optionalPhoneSchema, input)).toEqual([
      'Ingresá el código de área y el número, sin 0 ni 15',
    ])
  })

  it('rechaza lo que no es texto', () => {
    expect(errorsOf(optionalPhoneSchema, 1123456789)).toEqual([
      'Ingresá el código de área y el número, sin 0 ni 15',
    ])
  })
})

describe('streetSchema', () => {
  it('recorta los espacios', () => {
    expect(streetSchema.parse('  Av. Siempre Viva  ')).toBe('Av. Siempre Viva')
  })

  it.each(['', '   ', 'A'])('pide el dato si viene vacío o muy corto (%j)', (input) => {
    expect(errorsOf(streetSchema, input)).toEqual(['Requerido'])
  })

  it('pide el dato si falta', () => {
    expect(errorsOf(streetSchema, undefined)).toEqual(['Requerido'])
  })

  it('acepta hasta 80 caracteres y rechaza uno más', () => {
    expect(streetSchema.safeParse('a'.repeat(80)).success).toBe(true)
    expect(errorsOf(streetSchema, 'a'.repeat(81))).toEqual(['Máximo 80 caracteres'])
  })
})

describe('streetNumberSchema', () => {
  it.each([
    ['123', '123'],
    ['1', '1'],
    ['12345', '12345'],
    [' 42 ', '42'],
    ['s/n', 'S/N'],
    ['S/N', 'S/N'],
  ])('acepta %j como %j', (input, expected) => {
    expect(streetNumberSchema.parse(input)).toBe(expected)
  })

  it.each(['', '   ', undefined])('pide el dato si viene vacío o falta (%j)', (input) => {
    expect(errorsOf(streetNumberSchema, input)).toEqual(['Requerido'])
  })

  it.each(['123456', 'abc', '12a', 'sn', '12/3'])('rechaza %j', (input) => {
    expect(errorsOf(streetNumberSchema, input)).toEqual(['Ingresá el número o S/N'])
  })
})

describe('apartmentSchema', () => {
  it('es opcional', () => {
    expect(apartmentSchema.parse(undefined)).toBeUndefined()
  })

  it('recorta los espacios', () => {
    expect(apartmentSchema.parse(' 2° B ')).toBe('2° B')
  })

  it('acepta hasta 10 caracteres y rechaza uno más', () => {
    expect(apartmentSchema.safeParse('a'.repeat(10)).success).toBe(true)
    expect(errorsOf(apartmentSchema, 'a'.repeat(11))).toEqual(['Máximo 10 caracteres'])
  })
})

describe('postalCodeSchema', () => {
  it.each([
    ['1414', '1414'],
    ['C1414ABC', 'C1414ABC'],
    ['c1414abc', 'C1414ABC'],
    ['b1900', 'B1900'],
    ['5000xyz', '5000XYZ'],
    ['  1414  ', '1414'],
  ])('acepta %j como %j', (input, expected) => {
    expect(postalCodeSchema.parse(input)).toBe(expected)
  })

  it.each(['14', 'C1414ABCD', '', 'CC1414', '14145', 'ABCD', '1414ß'])('rechaza %j', (input) => {
    expect(errorsOf(postalCodeSchema, input)).toEqual(['Código postal inválido'])
  })

  it('rechaza un código que falta', () => {
    expect(errorsOf(postalCodeSchema, undefined)).toEqual(['Código postal inválido'])
  })
})

describe('citySchema', () => {
  it('recorta los espacios', () => {
    expect(citySchema.parse(' Rosario ')).toBe('Rosario')
  })

  it.each(['', 'A', undefined])('pide el dato si viene vacío, muy corto o falta (%j)', (input) => {
    expect(errorsOf(citySchema, input)).toEqual(['Requerido'])
  })

  it('acepta hasta 60 caracteres y rechaza uno más', () => {
    expect(citySchema.safeParse('a'.repeat(60)).success).toBe(true)
    expect(errorsOf(citySchema, 'a'.repeat(61))).toEqual(['Máximo 60 caracteres'])
  })
})

describe('provinceSchema', () => {
  it('acepta las 24 jurisdicciones del dominio', () => {
    expect(PROVINCES).toHaveLength(24)
    for (const province of PROVINCES) {
      expect(provinceSchema.parse(province)).toBe(province)
    }
  })

  it('acepta CABA', () => {
    expect(provinceSchema.parse('CABA')).toBe('CABA')
  })

  it.each(['Narnia', '', 'caba', undefined])('rechaza %j', (input) => {
    expect(errorsOf(provinceSchema, input)).toEqual(['Elegí una provincia'])
  })
})

describe('dniSchema', () => {
  it.each([
    ['12.345.678', '12345678'],
    ['12 345 678', '12345678'],
    [' 12345678 ', '12345678'],
    ['1.234.567', '1234567'],
  ])('quita los puntos y espacios de %j', (input, expected) => {
    expect(dniSchema.parse(input)).toBe(expected)
  })

  it.each(['123456', '123456789', 'ABC12345', '12-345-678', '', undefined])(
    'rechaza %j',
    (input) => {
      expect(errorsOf(dniSchema, input)).toEqual(['DNI inválido'])
    },
  )
})

describe('orderNumberSchema', () => {
  it.each([
    ['GLP-12345', 'GLP-12345'],
    [' glp-12345 ', 'GLP-12345'],
  ])('acepta %j como %j', (input, expected) => {
    expect(orderNumberSchema.parse(input)).toBe(expected)
  })

  it.each(['GLP-123', 'GLP-123456', 'GLP12345', 'XYZ-12345', ''])('rechaza %j', (input) => {
    expect(errorsOf(orderNumberSchema, input)).toEqual(['El número tiene el formato GLP-12345'])
  })
})

describe('honeypotSchema', () => {
  it.each(['', undefined])('acepta el campo trampa vacío o ausente (%j)', (input) => {
    expect(honeypotSchema.safeParse(input).success).toBe(true)
  })

  it('rechaza el campo trampa con contenido', () => {
    expect(honeypotSchema.safeParse('spam').success).toBe(false)
  })
})

describe('quantitySchema', () => {
  const quantity = quantitySchema(5)

  it.each([1, 3, 5])('acepta %j', (input) => {
    expect(quantity.parse(input)).toBe(input)
  })

  it.each([0, -1, 6, 1.5, '3', Number.NaN, undefined])('rechaza %j', (input) => {
    expect(quantity.safeParse(input).success).toBe(false)
  })

  it('sin stock no acepta ninguna cantidad', () => {
    expect(quantitySchema(0).safeParse(1).success).toBe(false)
  })
})
