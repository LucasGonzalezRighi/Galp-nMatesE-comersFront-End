import { describe, expect, expectTypeOf, it } from 'vitest'
import type { AddressBookEntry, AddressBookEntryInput } from './account'
import {
  addressBookEntrySchema,
  forgotPasswordSchema,
  loginPasswordSchema,
  loginSchema,
  passwordSchema,
  registerSchema,
  resetPasswordSchema,
} from './account'
import { issuesOf, messagesOf } from './test/helpers'

const WEAK = 'Mínimo 10 caracteres, con letras y números'

const validHome = {
  street: 'Av. Siempre Viva',
  number: '742',
  postalCode: 'c1414abc',
  city: 'Springfield',
  province: 'CABA',
}

describe('passwordSchema', () => {
  it.each(['abcdefghi1', 'ABCDEFGHI1', '1234567890a', 'contraseña1ñ', 'a'.repeat(127) + '1'])(
    'acepta %j',
    (input) => {
      expect(passwordSchema.parse(input)).toBe(input)
    },
  )

  it('no recorta los espacios: forman parte de la contraseña', () => {
    expect(passwordSchema.parse(' abcdefghi1 ')).toBe(' abcdefghi1 ')
  })

  it('acepta una contraseña con espacios en el medio', () => {
    expect(passwordSchema.safeParse('abc 123 xy').success).toBe(true)
  })

  it.each(['abcdefghij', '1234567890', 'abc12', '', '          ', '!!!!!!!!!!!'])(
    'rechaza %j con un solo mensaje',
    (input) => {
      expect(messagesOf(passwordSchema, input)).toEqual([WEAK])
    },
  )

  it.each([undefined, null, 1234567890])('rechaza lo que no es texto (%j)', (input) => {
    expect(messagesOf(passwordSchema, input)).toEqual([WEAK])
  })

  it('acepta hasta 128 caracteres y rechaza uno más', () => {
    expect(passwordSchema.safeParse('a'.repeat(127) + '1').success).toBe(true)
    expect(messagesOf(passwordSchema, 'a'.repeat(128) + '1')).toEqual(['Máximo 128 caracteres'])
  })
})

describe('registerSchema', () => {
  const validRegister = {
    email: ' Lucia@Ejemplo.com ',
    firstName: ' Lucía ',
    lastName: 'Gómez',
    password: 'abcdefghi1',
  }

  it('normaliza cada campo', () => {
    expect(registerSchema.parse(validRegister)).toEqual({
      email: 'lucia@ejemplo.com',
      firstName: 'Lucía',
      lastName: 'Gómez',
      password: 'abcdefghi1',
    })
  })

  it('da un mensaje por campo', () => {
    expect(
      issuesOf(registerSchema, { email: 'x', firstName: '', lastName: 'G', password: 'abc' }),
    ).toEqual([
      { path: ['email'], message: 'Ingresá un email válido' },
      { path: ['firstName'], message: 'Requerido' },
      { path: ['lastName'], message: 'Ingresá al menos 2 letras' },
      { path: ['password'], message: WEAK },
    ])
  })
})

describe('loginSchema', () => {
  it('normaliza el email y deja la contraseña como está', () => {
    expect(loginSchema.parse({ email: ' Lucia@Ejemplo.com ', password: ' abc ' })).toEqual({
      email: 'lucia@ejemplo.com',
      password: ' abc ',
    })
  })

  it('no exige que la contraseña cumpla la regla de las nuevas', () => {
    expect(loginSchema.safeParse({ email: 'lucia@ejemplo.com', password: 'corta' }).success).toBe(
      true,
    )
  })

  it.each(['', undefined, null])('pide la contraseña si llega %j', (password) => {
    expect(issuesOf(loginSchema, { email: 'lucia@ejemplo.com', password })).toEqual([
      { path: ['password'], message: 'Requerido' },
    ])
  })

  it('rechaza un email inválido', () => {
    expect(issuesOf(loginSchema, { email: 'x', password: 'abc' })).toEqual([
      { path: ['email'], message: 'Ingresá un email válido' },
    ])
  })
})

describe('loginPasswordSchema', () => {
  it('acepta hasta 128 caracteres y rechaza uno más', () => {
    expect(loginPasswordSchema.safeParse('a'.repeat(128)).success).toBe(true)
    expect(messagesOf(loginPasswordSchema, 'a'.repeat(129))).toEqual(['Máximo 128 caracteres'])
  })
})

describe('forgotPasswordSchema', () => {
  it('pide solo el email, en minúsculas', () => {
    expect(forgotPasswordSchema.parse({ email: ' Lucia@Ejemplo.com ' })).toEqual({
      email: 'lucia@ejemplo.com',
    })
  })

  it('rechaza un email inválido', () => {
    expect(issuesOf(forgotPasswordSchema, { email: '' })).toEqual([
      { path: ['email'], message: 'Ingresá un email válido' },
    ])
  })
})

describe('resetPasswordSchema', () => {
  const validReset = { token: 'abc123', password: 'abcdefghi1', passwordConfirmation: 'abcdefghi1' }

  it('acepta una confirmación igual a la contraseña', () => {
    expect(resetPasswordSchema.parse(validReset)).toEqual(validReset)
  })

  it('marca la confirmación distinta en passwordConfirmation', () => {
    expect(
      issuesOf(resetPasswordSchema, { ...validReset, passwordConfirmation: 'abcdefghi2' }),
    ).toEqual([{ path: ['passwordConfirmation'], message: 'Las contraseñas no coinciden' }])
  })

  it('distingue mayúsculas y espacios al comparar', () => {
    expect(
      resetPasswordSchema.safeParse({ ...validReset, passwordConfirmation: 'ABCDEFGHI1' }).success,
    ).toBe(false)
    expect(
      resetPasswordSchema.safeParse({ ...validReset, passwordConfirmation: 'abcdefghi1 ' }).success,
    ).toBe(false)
  })

  it('rechaza una contraseña débil en password', () => {
    const weak = { ...validReset, password: 'abcdefghij', passwordConfirmation: 'abcdefghij' }
    expect(issuesOf(resetPasswordSchema, weak)).toEqual([{ path: ['password'], message: WEAK }])
  })

  it.each(['', '   ', undefined])('pide el token si llega %j', (token) => {
    expect(issuesOf(resetPasswordSchema, { ...validReset, token })).toEqual([
      { path: ['token'], message: 'Requerido' },
    ])
  })
})

describe('addressBookEntrySchema', () => {
  it('normaliza la dirección y recorta la etiqueta', () => {
    expect(
      addressBookEntrySchema.parse({ ...validHome, label: ' Casa ', isDefault: true }),
    ).toEqual({
      label: 'Casa',
      street: 'Av. Siempre Viva',
      number: '742',
      postalCode: 'C1414ABC',
      city: 'Springfield',
      province: 'CABA',
      isDefault: true,
    })
  })

  it.each([undefined, '', '   '])(
    'la etiqueta ausente o vacía (%j) queda en undefined',
    (label) => {
      expect(addressBookEntrySchema.parse({ ...validHome, label, isDefault: false }).label).toBe(
        undefined,
      )
    },
  )

  it('acepta una etiqueta de hasta 30 caracteres y rechaza una más', () => {
    expect(
      addressBookEntrySchema.safeParse({ ...validHome, label: 'a'.repeat(30), isDefault: false })
        .success,
    ).toBe(true)
    expect(
      issuesOf(addressBookEntrySchema, { ...validHome, label: 'a'.repeat(31), isDefault: false }),
    ).toEqual([{ path: ['label'], message: 'Máximo 30 caracteres' }])
  })

  it('da un mensaje por cada campo de la dirección que falta', () => {
    expect(issuesOf(addressBookEntrySchema, { isDefault: false }).map((i) => i.path)).toEqual([
      ['street'],
      ['number'],
      ['postalCode'],
      ['city'],
      ['province'],
    ])
  })

  it('exige saber si es la dirección predeterminada', () => {
    expect(issuesOf(addressBookEntrySchema, validHome).map((i) => i.path)).toEqual([['isDefault']])
  })

  it('deja el piso o departamento vacío en undefined', () => {
    expect(
      addressBookEntrySchema.parse({ ...validHome, apartment: ' ', isDefault: false }).apartment,
    ).toBeUndefined()
  })

  it('tiene tipos de entrada y de salida distintos', () => {
    expectTypeOf<AddressBookEntryInput['isDefault']>().toEqualTypeOf<boolean>()
    expectTypeOf<AddressBookEntry['label']>().toEqualTypeOf<string | undefined>()
  })
})
