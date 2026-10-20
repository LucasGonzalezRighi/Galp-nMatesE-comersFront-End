import type { z } from 'zod'
import { describe, expect, expectTypeOf, it } from 'vitest'
import type { Province, ShippingMethod } from '@galpon/domain'
import { ADDRESS_FIELDS_BY_METHOD, SHIPPING_METHODS } from '@galpon/domain'
import type {
  BranchAddress,
  BranchAddressInput,
  Cardholder,
  CardholderInput,
  CheckoutContact,
  CheckoutContactInput,
  HomeAddress,
  HomeAddressInput,
  Shipping,
  ShippingInput,
} from './checkout'
import {
  branchAddressSchema,
  cardholderSchema,
  checkoutContactSchema,
  homeAddressSchema,
  shippingSchema,
} from './checkout'

/** Camino y mensaje de cada error que da un schema para una entrada (vacío si es válida). */
function issuesOf(schema: z.ZodType, input: unknown): { path: PropertyKey[]; message: string }[] {
  const result = schema.safeParse(input)
  return result.success ? [] : result.error.issues.map(({ path, message }) => ({ path, message }))
}

const validHome = {
  street: 'Av. Siempre Viva',
  number: '742',
  postalCode: 'c1414abc',
  city: 'Springfield',
  province: 'CABA',
}

describe('checkoutContactSchema', () => {
  it('normaliza cada campo', () => {
    expect(
      checkoutContactSchema.parse({
        email: ' Vos@Ejemplo.com ',
        firstName: ' Lucía ',
        lastName: 'Gómez',
        phone: '+54 9 11 2345 6789',
      }),
    ).toEqual({
      email: 'vos@ejemplo.com',
      firstName: 'Lucía',
      lastName: 'Gómez',
      phone: '1123456789',
    })
  })

  it.each([undefined, ''])('el teléfono es opcional (%j)', (phone) => {
    const result = checkoutContactSchema.parse({
      email: 'vos@ejemplo.com',
      firstName: 'Lucía',
      lastName: 'Gómez',
      phone,
    })
    expect(result.phone).toBeUndefined()
  })

  it('marca cada campo inválido con su mensaje', () => {
    expect(
      issuesOf(checkoutContactSchema, {
        email: 'vos@',
        firstName: '',
        lastName: 'A',
        phone: '011 2345 6789',
      }),
    ).toEqual([
      { path: ['email'], message: 'Ingresá un email válido' },
      { path: ['firstName'], message: 'Requerido' },
      { path: ['lastName'], message: 'Ingresá al menos 2 letras' },
      { path: ['phone'], message: 'Ingresá el código de área y el número, sin 0 ni 15' },
    ])
  })
})

describe('homeAddressSchema', () => {
  it('normaliza cada campo', () => {
    expect(
      homeAddressSchema.parse({
        ...validHome,
        number: 's/n',
        apartment: ' 2° B ',
        city: ' Rosario ',
      }),
    ).toEqual({
      street: 'Av. Siempre Viva',
      number: 'S/N',
      apartment: '2° B',
      postalCode: 'C1414ABC',
      city: 'Rosario',
      province: 'CABA',
    })
  })

  it('el piso o departamento es opcional', () => {
    expect(homeAddressSchema.safeParse(validHome).success).toBe(true)
  })

  it('pide los mismos campos, en el mismo orden, que el dominio para el envío a domicilio', () => {
    expect(Object.keys(homeAddressSchema.shape)).toEqual([...ADDRESS_FIELDS_BY_METHOD.home])
  })
})

describe('branchAddressSchema', () => {
  it('pide los mismos campos, en el mismo orden, que el dominio para el envío a sucursal', () => {
    expect(Object.keys(branchAddressSchema.shape)).toEqual([...ADDRESS_FIELDS_BY_METHOD.branch])
  })

  it('no pide calle ni número', () => {
    expect(
      branchAddressSchema.parse({ postalCode: 'x1234', city: 'Rosario', province: 'Santa Fe' }),
    ).toEqual({ postalCode: 'X1234', city: 'Rosario', province: 'Santa Fe' })
  })
})

describe('shippingSchema', () => {
  it('tiene un caso por cada método del dominio, en el mismo orden', () => {
    expect(shippingSchema.options.map((option) => option.shape.method.value)).toEqual([
      ...SHIPPING_METHODS,
    ])
  })

  it('el retiro en persona es válido sin dirección', () => {
    expect(shippingSchema.parse({ method: 'pickup' })).toEqual({ method: 'pickup' })
  })

  it('el retiro en persona descarta la dirección que sobre', () => {
    expect(shippingSchema.parse({ method: 'pickup', address: validHome })).toEqual({
      method: 'pickup',
    })
  })

  it('el envío a domicilio valida y normaliza la dirección completa', () => {
    expect(shippingSchema.parse({ method: 'home', address: validHome })).toEqual({
      method: 'home',
      address: { ...validHome, postalCode: 'C1414ABC' },
    })
  })

  it('el envío a domicilio sin calle marca address.street', () => {
    const withoutStreet = Object.fromEntries(
      Object.entries(validHome).filter(([field]) => field !== 'street'),
    )
    expect(issuesOf(shippingSchema, { method: 'home', address: withoutStreet })).toEqual([
      { path: ['address', 'street'], message: 'Requerido' },
    ])
  })

  it('el envío a sucursal pide solo código postal, ciudad y provincia', () => {
    const address = { postalCode: '2000', city: 'Rosario', province: 'Santa Fe' }
    expect(
      shippingSchema.parse({ method: 'branch', address: { ...address, street: 'Ignorada' } }),
    ).toEqual({ method: 'branch', address })
  })

  it('el envío a sucursal sin código postal marca address.postalCode', () => {
    expect(
      issuesOf(shippingSchema, {
        method: 'branch',
        address: { city: 'Rosario', province: 'Santa Fe' },
      }),
    ).toEqual([{ path: ['address', 'postalCode'], message: 'Código postal inválido' }])
  })

  it('rechaza un método que no existe', () => {
    const issues = issuesOf(shippingSchema, { method: 'drone', address: validHome })
    expect(issues).toHaveLength(1)
    expect(issues[0]?.path).toEqual(['method'])
  })

  it('rechaza un envío sin método', () => {
    expect(shippingSchema.safeParse({}).success).toBe(false)
  })
})

describe('cardholderSchema', () => {
  const valid = {
    cardholderName: 'Lucía Gómez',
    identificationType: 'DNI',
    identificationNumber: '12.345.678',
  }

  it('con DNI quita los puntos del número', () => {
    expect(cardholderSchema.parse({ ...valid, cardholderName: ' Lucía Gómez ' })).toEqual({
      cardholderName: 'Lucía Gómez',
      identificationType: 'DNI',
      identificationNumber: '12345678',
    })
  })

  it('con DNI inválido marca identificationNumber', () => {
    expect(issuesOf(cardholderSchema, { ...valid, identificationNumber: '123456' })).toEqual([
      { path: ['identificationNumber'], message: 'DNI inválido' },
    ])
  })

  it('con nombre vacío marca cardholderName', () => {
    expect(issuesOf(cardholderSchema, { ...valid, cardholderName: '' })).toEqual([
      { path: ['cardholderName'], message: 'Como figura en la tarjeta' },
    ])
  })

  it('informa a la vez el nombre y el documento inválidos', () => {
    expect(
      issuesOf(cardholderSchema, { ...valid, cardholderName: '', identificationNumber: '123' }),
    ).toEqual([
      { path: ['cardholderName'], message: 'Como figura en la tarjeta' },
      { path: ['identificationNumber'], message: 'DNI inválido' },
    ])
  })

  it('acepta hasta 60 caracteres en el nombre y rechaza uno más', () => {
    expect(cardholderSchema.safeParse({ ...valid, cardholderName: 'a'.repeat(60) }).success).toBe(
      true,
    )
    expect(issuesOf(cardholderSchema, { ...valid, cardholderName: 'a'.repeat(61) })).toEqual([
      { path: ['cardholderName'], message: 'Máximo 60 caracteres' },
    ])
  })

  it('pide el tipo de documento', () => {
    // Sin puntos, el número cumple la regla de cualquier tipo.
    expect(
      issuesOf(cardholderSchema, {
        ...valid,
        identificationType: '',
        identificationNumber: '12345678',
      }),
    ).toEqual([{ path: ['identificationType'], message: 'Requerido' }])
  })

  it('pide el número de documento si falta', () => {
    expect(
      issuesOf(cardholderSchema, { cardholderName: 'Lucía Gómez', identificationType: 'DNI' }),
    ).toEqual([{ path: ['identificationNumber'], message: 'Requerido' }])
  })

  it.each([
    ['20123456786', '20123456786'],
    ['AB123', 'AB123'],
    [' ab123 ', 'ab123'],
    ['a'.repeat(20), 'a'.repeat(20)],
  ])('con otro tipo de documento acepta %j como %j', (identificationNumber, expected) => {
    expect(
      cardholderSchema.parse({ ...valid, identificationType: 'CUIT', identificationNumber }),
    ).toEqual({ ...valid, identificationType: 'CUIT', identificationNumber: expected })
  })

  it.each(['1234', 'a'.repeat(21), '20-12345678-6', '12.345.678', ''])(
    'con otro tipo de documento rechaza %j',
    (identificationNumber) => {
      expect(
        issuesOf(cardholderSchema, { ...valid, identificationType: 'CUIT', identificationNumber }),
      ).toEqual([{ path: ['identificationNumber'], message: 'Documento inválido' }])
    },
  )
})

describe('tipos', () => {
  it('coinciden con los del dominio', () => {
    expectTypeOf<ShippingInput['method']>().toEqualTypeOf<ShippingMethod>()
    expectTypeOf<Shipping['method']>().toEqualTypeOf<ShippingMethod>()
    expectTypeOf<HomeAddress['province']>().toEqualTypeOf<Province>()
    expectTypeOf<BranchAddress['province']>().toEqualTypeOf<Province>()
  })

  it('distinguen la entrada de la salida', () => {
    expectTypeOf<CheckoutContactInput>().toEqualTypeOf<{
      email: string
      firstName: string
      lastName: string
      phone?: string | undefined
    }>()
    expectTypeOf<CheckoutContact>().toEqualTypeOf<{
      email: string
      firstName: string
      lastName: string
      phone?: string | undefined
    }>()
    expectTypeOf<HomeAddressInput['apartment']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<BranchAddressInput['postalCode']>().toEqualTypeOf<string>()
    expectTypeOf<CardholderInput>().toEqualTypeOf<Cardholder>()
  })
})
