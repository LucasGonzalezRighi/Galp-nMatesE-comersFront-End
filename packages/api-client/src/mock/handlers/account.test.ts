import { describe, expect, it } from 'vitest'
import type { AddressBookInput } from '../../generated/schema'
import type { MockCustomer, MockPasswordResetMail } from '../types'
import {
  createMyAddress,
  deleteMe,
  deleteMyAddress,
  forgotPassword,
  getCustomerCsrfToken,
  getMe,
  getMyOrder,
  getOrder,
  listMyAddresses,
  listMyOrders,
  login,
  logout,
  register,
  resetPassword,
  updateMe,
  updateMyAddress,
} from '../../services'
import { MOCK_DB_LIMITS } from '../limits'
import { createCheckoutApi, placeOrder } from '../test/checkout-api'
import { PASSWORD_RESET_TTL_MS } from './account'
import { DEFAULT_CUSTOMER_SESSION_COOKIE } from './customer-session'

const ACCOUNT = {
  email: 'lucia@ejemplo.com',
  firstName: 'Lucía',
  lastName: 'Pérez',
  password: 'mate-con-yerba-2026',
}

const HOME: AddressBookInput = {
  label: 'Casa',
  street: 'Av. Corrientes',
  number: '1234',
  apartment: null,
  postalCode: 'C1043',
  city: 'CABA',
  province: 'CABA',
  isDefault: true,
}

type Mock = ReturnType<typeof createCheckoutApi>

/** Pide el token CSRF de la sesión actual y lo deja puesto en el cliente. */
async function refreshCsrf(mock: Mock): Promise<string> {
  const { csrfToken } = await getCustomerCsrfToken(mock.api)
  mock.setCsrfToken(csrfToken)
  return csrfToken
}

/** Crea la cuenta de prueba y deja la sesión con su token CSRF. */
async function signUp(mock: Mock, input = ACCOUNT) {
  await refreshCsrf(mock)
  const customer = await register(mock.api, input)
  await refreshCsrf(mock)
  return customer
}

describe('sesión y CSRF', () => {
  it('GET /auth/csrf abre una sesión anónima con su cookie y repite el token', async () => {
    const mock = createCheckoutApi()
    const token = await refreshCsrf(mock)
    expect(mock.cookies.has(DEFAULT_CUSTOMER_SESSION_COOKIE)).toBe(true)
    await expect(getCustomerCsrfToken(mock.api)).resolves.toEqual({ csrfToken: token })
  })

  it('register sin token CSRF, o con otro, responde 403', async () => {
    const mock = createCheckoutApi()
    await expect(register(mock.api, ACCOUNT)).rejects.toMatchObject({ status: 403 })
    await refreshCsrf(mock)
    mock.setCsrfToken('otro')
    await expect(register(mock.api, ACCOUNT)).rejects.toMatchObject({ status: 403 })
  })

  it('register crea la cuenta, abre la sesión con otra cookie y cambia el token', async () => {
    const mock = createCheckoutApi()
    const anonymous = await refreshCsrf(mock)
    const cookie = mock.cookies.get(DEFAULT_CUSTOMER_SESSION_COOKIE)
    await expect(register(mock.api, { ...ACCOUNT, email: ' Lucia@Ejemplo.com ' })).resolves.toEqual(
      {
        email: 'lucia@ejemplo.com',
        firstName: 'Lucía',
        lastName: 'Pérez',
        phone: null,
      },
    )
    expect(mock.cookies.get(DEFAULT_CUSTOMER_SESSION_COOKIE)).not.toBe(cookie)
    await expect(getMe(mock.api)).resolves.toMatchObject({ email: 'lucia@ejemplo.com' })
    await expect(refreshCsrf(mock)).resolves.not.toBe(anonymous)
  })

  it('register con un email que ya tiene cuenta responde 409', async () => {
    const mock = createCheckoutApi()
    await signUp(mock)
    await expect(register(mock.api, ACCOUNT)).rejects.toMatchObject({
      status: 409,
      problem: { type: 'email_already_registered' },
    })
  })

  it('login con datos incorrectos responde 401 y con los correctos abre la sesión', async () => {
    const mock = createCheckoutApi()
    await signUp(mock)
    await logout(mock.api)
    await expect(getMe(mock.api)).rejects.toMatchObject({ status: 401 })
    await refreshCsrf(mock)
    await expect(
      login(mock.api, { email: ACCOUNT.email, password: 'otra-clave-123' }),
    ).rejects.toMatchObject({ status: 401, problem: { type: 'invalid_credentials' } })
    await expect(
      login(mock.api, { email: ACCOUNT.email, password: ACCOUNT.password }),
    ).resolves.toMatchObject({ email: ACCOUNT.email })
    await expect(getMe(mock.api)).resolves.toMatchObject({ firstName: 'Lucía' })
  })

  it('logout sin sesión responde 401 y borra la cookie al cerrar', async () => {
    const mock = createCheckoutApi()
    await refreshCsrf(mock)
    await expect(logout(mock.api)).rejects.toMatchObject({ status: 401 })
    await signUp(mock)
    await logout(mock.api)
    expect(mock.cookies.has(DEFAULT_CUSTOMER_SESSION_COOKIE)).toBe(false)
  })

  it('las escrituras de la cuenta piden el token CSRF', async () => {
    const mock = createCheckoutApi()
    await signUp(mock)
    mock.setCsrfToken(undefined)
    await expect(updateMe(mock.api, { firstName: 'Paula' })).rejects.toMatchObject({
      status: 403,
    })
    await expect(createMyAddress(mock.api, HOME)).rejects.toMatchObject({ status: 403 })
  })
})

describe('contraseña', () => {
  it('forgot responde 202 exista o no la cuenta', async () => {
    const mock = createCheckoutApi()
    await refreshCsrf(mock)
    await expect(forgotPassword(mock.api, { email: 'nadie@ejemplo.com' })).resolves.toBeUndefined()
  })

  it('forgot de una cuenta que existe manda el enlace con un token al azar y guarda solo su hash', async () => {
    const mails: MockPasswordResetMail[] = []
    const mock = createCheckoutApi({ onPasswordReset: (mail) => mails.push(mail) })
    await signUp(mock)
    await forgotPassword(mock.api, { email: 'nadie@ejemplo.com' })
    expect(mails).toEqual([])

    await forgotPassword(mock.api, { email: ACCOUNT.email })
    await forgotPassword(mock.api, { email: ACCOUNT.email })
    const [first, second] = mails
    expect(first).toEqual({
      email: ACCOUNT.email,
      token: expect.stringMatching(/^rt_[0-9a-f]{64}$/) as unknown,
      expiresAt: new Date(Date.parse('2026-10-26T15:00:00Z') + PASSWORD_RESET_TTL_MS).toISOString(),
    })
    expect(second?.token).not.toBe(first?.token)
    const stored = JSON.stringify(mock.db.customers)
    expect(stored).not.toContain(first?.token)
    expect(stored).not.toContain(second?.token)
    expect(mock.db.customers[0]?.passwordReset?.tokenHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('reset con el token del enlace cambia la contraseña y cierra las sesiones; el token constante de antes no sirve', async () => {
    const mails: MockPasswordResetMail[] = []
    const mock = createCheckoutApi({ onPasswordReset: (mail) => mails.push(mail) })
    await signUp(mock)
    await logout(mock.api)
    await refreshCsrf(mock)
    await forgotPassword(mock.api, { email: ACCOUNT.email })
    for (const token of ['otro', 'RESET-OK']) {
      await expect(
        resetPassword(mock.api, { token, password: 'nueva-clave-2026' }),
      ).rejects.toMatchObject({
        status: 422,
        fieldErrors: { token: expect.any(String) as unknown },
      })
    }
    await resetPassword(mock.api, { token: mails[0]?.token ?? '', password: 'nueva-clave-2026' })
    await expect(
      login(mock.api, { email: ACCOUNT.email, password: 'nueva-clave-2026' }),
    ).resolves.toMatchObject({ email: ACCOUNT.email })
  })

  it('el token es de un solo uso, vence a los 60 minutos y un pedido nuevo anula el anterior', async () => {
    const mails: MockPasswordResetMail[] = []
    const mock = createCheckoutApi({ onPasswordReset: (mail) => mails.push(mail) })
    await signUp(mock)
    const reset = (token: string | undefined, password: string) =>
      resetPassword(mock.api, { token: token ?? '', password })

    await forgotPassword(mock.api, { email: ACCOUNT.email })
    await reset(mails.at(-1)?.token, 'primera-clave-2026')
    await refreshCsrf(mock)
    await expect(reset(mails.at(-1)?.token, 'segunda-clave-2026')).rejects.toMatchObject({
      status: 422,
    })

    await forgotPassword(mock.api, { email: ACCOUNT.email })
    const replaced = mails.at(-1)?.token
    await forgotPassword(mock.api, { email: ACCOUNT.email })
    await expect(reset(replaced, 'segunda-clave-2026')).rejects.toMatchObject({ status: 422 })

    mock.advance(61)
    await expect(reset(mails.at(-1)?.token, 'segunda-clave-2026')).rejects.toMatchObject({
      status: 422,
    })
    await refreshCsrf(mock)
    await expect(
      login(mock.api, { email: ACCOUNT.email, password: 'primera-clave-2026' }),
    ).resolves.toMatchObject({ email: ACCOUNT.email })
  })

  it('el token cambia la contraseña de su cuenta, no la del último que pidió el cambio', async () => {
    const mails: MockPasswordResetMail[] = []
    const mock = createCheckoutApi({ onPasswordReset: (mail) => mails.push(mail) })
    const victim = { ...ACCOUNT, email: 'vera@ejemplo.com', password: 'original-clave-1' }
    await signUp(mock, victim)
    await logout(mock.api)
    await signUp(mock)
    await forgotPassword(mock.api, { email: ACCOUNT.email })
    await forgotPassword(mock.api, { email: victim.email })

    await resetPassword(mock.api, {
      token: mails.find((mail) => mail.email === ACCOUNT.email)?.token ?? '',
      password: 'cambiada-clave-2',
    })
    await refreshCsrf(mock)
    await expect(
      login(mock.api, { email: victim.email, password: 'cambiada-clave-2' }),
    ).rejects.toMatchObject({ status: 401 })
    await expect(
      login(mock.api, { email: victim.email, password: victim.password }),
    ).resolves.toMatchObject({ email: victim.email })
  })
})

/** Cliente de relleno para llenar la base hasta el tope. */
function fillerCustomer(index: number): MockCustomer {
  return {
    id: `cus-${String(index + 1).padStart(4, '0')}`,
    email: `relleno-${String(index)}@ejemplo.com`,
    firstName: 'Relleno',
    lastName: 'Prueba',
    phone: null,
    password: 'relleno-clave-1',
    addresses: [],
    passwordReset: null,
    createdAt: '2026-10-01T12:00:00.000Z',
  }
}

describe('topes de la base', () => {
  it('guarda hasta MOCK_DB_LIMITS.customerSessions sesiones: una nueva descarta la más vieja', async () => {
    const mock = createCheckoutApi()
    const expiresAt = '2026-10-27T15:00:00.000Z'
    mock.db.customerSessions = Array.from({ length: MOCK_DB_LIMITS.customerSessions }, (_, i) => ({
      id: `ses-${String(i)}`,
      customerId: null,
      csrfToken: `csrf-${String(i)}`,
      expiresAt,
    }))
    await refreshCsrf(mock)
    expect(mock.db.customerSessions).toHaveLength(MOCK_DB_LIMITS.customerSessions)
    expect(mock.db.customerSessions[0]?.id).toBe('ses-1')
    expect(mock.db.customerSessions.at(-1)?.id).toBe(
      mock.cookies.get(DEFAULT_CUSTOMER_SESSION_COOKIE),
    )
  })

  it('guarda hasta MOCK_DB_LIMITS.customers clientes: el alta nueva descarta el más viejo y no repite el id', async () => {
    const mock = createCheckoutApi()
    mock.db.customers = Array.from({ length: MOCK_DB_LIMITS.customers }, (_, i) =>
      fillerCustomer(i),
    )
    await signUp(mock)
    expect(mock.db.customers).toHaveLength(MOCK_DB_LIMITS.customers)
    expect(mock.db.customers[0]?.email).toBe('relleno-1@ejemplo.com')
    const ids = mock.db.customers.map((customer) => customer.id)
    expect(new Set(ids).size).toBe(ids.length)
    await expect(getMe(mock.api)).resolves.toMatchObject({ email: ACCOUNT.email })
  })

  it('guarda hasta MOCK_DB_LIMITS.addressesPerCustomer direcciones por cliente: descarta la más vieja', async () => {
    const mock = createCheckoutApi()
    await signUp(mock)
    const first = await createMyAddress(mock.api, { ...HOME, isDefault: false })
    for (let i = 1; i < MOCK_DB_LIMITS.addressesPerCustomer; i += 1) {
      await createMyAddress(mock.api, {
        ...HOME,
        label: `Dirección ${String(i)}`,
        isDefault: false,
      })
    }
    const last = await createMyAddress(mock.api, { ...HOME, label: 'La nueva', isDefault: false })
    const list = await listMyAddresses(mock.api)
    expect(list).toHaveLength(MOCK_DB_LIMITS.addressesPerCustomer)
    expect(list.map((address) => address.id)).not.toContain(first.id)
    expect(list.map((address) => address.id)).toContain(last.id)
  })
})

describe('mis datos', () => {
  it('PATCH /me cambia solo lo que viene y phone null borra el teléfono', async () => {
    const mock = createCheckoutApi()
    await signUp(mock)
    await expect(updateMe(mock.api, { phone: '11 2345-6789' })).resolves.toMatchObject({
      phone: '1123456789',
      firstName: 'Lucía',
    })
    await expect(updateMe(mock.api, { phone: null, lastName: 'Gómez' })).resolves.toEqual({
      email: ACCOUNT.email,
      firstName: 'Lucía',
      lastName: 'Gómez',
      phone: null,
    })
    await expect(updateMe(mock.api, {})).rejects.toMatchObject({ status: 422 })
  })
})

describe('eliminar la cuenta', () => {
  it('sin sesión responde 401 y sin token CSRF, 403', async () => {
    const mock = createCheckoutApi()
    await refreshCsrf(mock)
    await expect(deleteMe(mock.api, { password: ACCOUNT.password })).rejects.toMatchObject({
      status: 401,
    })
    await signUp(mock)
    mock.setCsrfToken(undefined)
    await expect(deleteMe(mock.api, { password: ACCOUNT.password })).rejects.toMatchObject({
      status: 403,
    })
    expect(mock.db.customers).toHaveLength(1)
  })

  it('con la contraseña equivocada responde 422 y no borra nada', async () => {
    const mock = createCheckoutApi()
    await signUp(mock)
    await expect(deleteMe(mock.api, { password: 'otra-clave-123' })).rejects.toMatchObject({
      status: 422,
      problem: {
        errors: [
          { field: 'password', code: 'invalid_password', message: 'La contraseña no es correcta' },
        ],
      },
    })
    await expect(deleteMe(mock.api, { password: '' })).rejects.toMatchObject({
      status: 422,
      problem: { errors: [{ field: 'password', message: 'Requerido' }] },
    })
    await expect(getMe(mock.api)).resolves.toMatchObject({ email: ACCOUNT.email })
  })

  it('con la contraseña borra la cuenta, cierra las sesiones y deja los pedidos sin dueño', async () => {
    const mock = createCheckoutApi()
    await signUp(mock)
    await createMyAddress(mock.api, HOME)
    const { order } = await placeOrder(mock)
    const customerId = mock.db.orders[0]?.ownerId
    expect(customerId).toEqual(expect.any(String))

    await expect(deleteMe(mock.api, { password: ACCOUNT.password })).resolves.toBeUndefined()
    expect(mock.cookies.has(DEFAULT_CUSTOMER_SESSION_COOKIE)).toBe(false)
    expect(mock.db.customers).toEqual([])
    expect(mock.db.customerSessions.filter((s) => s.customerId === customerId)).toEqual([])
    const saved = mock.db.orders.find((candidate) => candidate.number === order.number)
    expect(saved?.ownerId).toBeNull()
    expect(saved?.customer.email).toBe(ACCOUNT.email)

    await expect(getMe(mock.api)).rejects.toMatchObject({ status: 401 })
    await refreshCsrf(mock)
    await expect(
      login(mock.api, { email: ACCOUNT.email, password: ACCOUNT.password }),
    ).rejects.toMatchObject({ status: 401, problem: { type: 'invalid_credentials' } })
  })
})

describe('mis pedidos', () => {
  it('una cuenta nueva no ve los pedidos de invitado hechos con el mismo email', async () => {
    const mock = createCheckoutApi()
    const guest = await placeOrder(mock)
    mock.setOrderToken(undefined)
    await signUp(mock)

    await expect(listMyOrders(mock.api)).resolves.toEqual({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
    })
    await expect(getMyOrder(mock.api, guest.order.number)).rejects.toMatchObject({ status: 404 })
    await expect(getOrder(mock.api, guest.order.number)).rejects.toMatchObject({ status: 404 })
    expect(mock.db.orders[0]?.ownerId).toBeNull()
  })

  it('un pedido hecho con la sesión iniciada queda en la cuenta', async () => {
    const mock = createCheckoutApi()
    await signUp(mock)
    const { order } = await placeOrder(mock)
    await expect(listMyOrders(mock.api)).resolves.toMatchObject({
      items: [{ number: order.number }],
    })
  })

  it('sin sesión responde 401', async () => {
    const mock = createCheckoutApi()
    await expect(listMyOrders(mock.api)).rejects.toMatchObject({ status: 401 })
  })
})

describe('mis direcciones', () => {
  it('guarda, modifica y borra, con una sola predeterminada', async () => {
    const mock = createCheckoutApi()
    await signUp(mock)
    const home = await createMyAddress(mock.api, HOME)
    expect(home).toMatchObject({ ...HOME, id: expect.any(String) as unknown })
    const work = await createMyAddress(mock.api, {
      ...HOME,
      label: 'Trabajo',
      number: 's/n',
      isDefault: true,
    })
    expect(work.number).toBe('S/N')
    const list = await listMyAddresses(mock.api)
    expect(list.map((address) => [address.label, address.isDefault])).toEqual([
      ['Trabajo', true],
      ['Casa', false],
    ])
    await expect(
      updateMyAddress(mock.api, home.id, { ...HOME, city: 'Rosario', province: 'Santa Fe' }),
    ).resolves.toMatchObject({ id: home.id, city: 'Rosario', isDefault: true })
    await expect(listMyAddresses(mock.api)).resolves.toMatchObject([
      { id: home.id, isDefault: true },
      { id: work.id, isDefault: false },
    ])
    await deleteMyAddress(mock.api, work.id)
    await expect(deleteMyAddress(mock.api, work.id)).rejects.toMatchObject({ status: 404 })
    await expect(listMyAddresses(mock.api)).resolves.toHaveLength(1)
  })

  it('valida la dirección con los mensajes por campo', async () => {
    const mock = createCheckoutApi()
    await signUp(mock)
    await expect(createMyAddress(mock.api, { ...HOME, postalCode: 'X' })).rejects.toMatchObject({
      status: 422,
      fieldErrors: { postalCode: expect.any(String) as unknown },
    })
  })
})
