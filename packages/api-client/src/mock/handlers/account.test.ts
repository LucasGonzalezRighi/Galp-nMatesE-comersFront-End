import { describe, expect, it } from 'vitest'
import type { AddressBookInput } from '../../generated/schema'
import {
  createMyAddress,
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
import { createCheckoutApi, placeOrder } from '../test/checkout-api'
import { MOCK_PASSWORD_RESET_TOKEN } from './account'
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

  it('reset con el token de prueba cambia la contraseña; otro token es 422', async () => {
    const mock = createCheckoutApi()
    await signUp(mock)
    await logout(mock.api)
    await refreshCsrf(mock)
    await forgotPassword(mock.api, { email: ACCOUNT.email })
    await expect(
      resetPassword(mock.api, { token: 'otro', password: 'nueva-clave-2026' }),
    ).rejects.toMatchObject({ status: 422, fieldErrors: { token: expect.any(String) as unknown } })
    await resetPassword(mock.api, {
      token: MOCK_PASSWORD_RESET_TOKEN,
      password: 'nueva-clave-2026',
    })
    await expect(
      login(mock.api, { email: ACCOUNT.email, password: 'nueva-clave-2026' }),
    ).resolves.toMatchObject({ email: ACCOUNT.email })
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

describe('mis pedidos', () => {
  it('los pedidos de invitado con el mismo email se asocian al registrarse', async () => {
    const mock = createCheckoutApi()
    const guest = await placeOrder(mock)
    await placeOrder(mock, {
      customer: { email: 'otra@ejemplo.com', firstName: 'Ana', lastName: 'Gil', phone: null },
    })
    mock.setOrderToken(undefined)
    await signUp(mock)
    const page = await listMyOrders(mock.api)
    expect(page).toEqual({
      items: [
        {
          number: guest.order.number,
          createdAt: guest.order.createdAt,
          status: 'pending_payment',
          paymentStatus: 'none',
          totalArs: 46499,
          itemCount: 1,
        },
      ],
      page: 1,
      pageSize: 10,
      total: 1,
    })
    await expect(getMyOrder(mock.api, guest.order.number)).resolves.toMatchObject({
      number: guest.order.number,
    })
    await expect(getOrder(mock.api, guest.order.number)).resolves.toMatchObject({
      number: guest.order.number,
    })
    const other = mock.db.orders[1]?.number ?? ''
    await expect(getMyOrder(mock.api, other)).rejects.toMatchObject({ status: 404 })
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
