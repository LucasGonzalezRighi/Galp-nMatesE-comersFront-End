import { z } from 'zod'
import {
  addressBookEntrySchema,
  forgotPasswordSchema,
  loginSchema,
  optionalPhoneSchema,
  passwordSchema,
  personNameSchema,
  registerSchema,
} from '@galpon/schemas'
import type { Address, Customer } from '../../generated/schema'
import type { MockContext, MockRoute } from '../router'
import type { MockCustomer } from '../types'
import { json, noContent, notFound, problem, ResponseError, validationProblem } from '../http'
import { route } from '../router'
import { randomUuid } from '../uuid'
import { orderNumberParam, parseOrFail, QueryReader, withoutNulls } from '../validation'
import {
  currentSession,
  endSession,
  requireCsrf,
  requireCustomer,
  startSession,
  withSessionCookie,
} from './customer-session'
import { expireOrders, orderNotFound, toOrder, toOrderSummary } from './order-state'

/**
 * Token de prueba del enlace de cambio de contraseña: cambia la contraseña de la cuenta que pidió
 * el cambio más recientemente con `POST /auth/password/forgot`.
 */
export const MOCK_PASSWORD_RESET_TOKEN = 'RESET-OK'

/** Pedidos por página de "Mis pedidos". */
const MY_ORDERS_PAGE_SIZE = 10

/** Cuerpo de `POST /auth/password/reset` (el contrato no lleva la confirmación). */
const resetPasswordSchema = z.object({
  token: z.string().min(1).max(255),
  password: passwordSchema,
})

/** Cuerpo de `PATCH /me`: solo cambia lo que viene, y `phone: null` borra el teléfono. */
const customerUpdateSchema = z.object({
  firstName: personNameSchema.optional(),
  lastName: personNameSchema.optional(),
  phone: optionalPhoneSchema.nullable(),
})

/** Datos públicos de un cliente. */
function toCustomer(customer: MockCustomer): Customer {
  const { email, firstName, lastName, phone } = customer
  return { email, firstName, lastName, phone }
}

/** Libreta del cliente con la predeterminada primero. */
function sortedAddresses(customer: MockCustomer): Address[] {
  return [...customer.addresses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
}

/** Lee y valida una dirección de la libreta. */
async function readAddress(ctx: MockContext): Promise<Omit<Address, 'id'>> {
  const entry = parseOrFail(addressBookEntrySchema, withoutNulls(await ctx.body()))
  return { ...entry, label: entry.label ?? null, apartment: entry.apartment ?? null }
}

/** Guarda una dirección; si es la predeterminada, las demás dejan de serlo. */
function saveAddress(customer: MockCustomer, address: Address): void {
  const exists = customer.addresses.some((existing) => existing.id === address.id)
  const addresses = exists
    ? customer.addresses.map((existing) => (existing.id === address.id ? address : existing))
    : [...customer.addresses, address]
  customer.addresses = addresses.map((existing) =>
    address.isDefault && existing.id !== address.id ? { ...existing, isDefault: false } : existing,
  )
}

/** Dirección de la libreta del cliente con el `{id}` de la ruta. */
function addressOf(ctx: MockContext, customer: MockCustomer): Address {
  const address = customer.addresses.find((candidate) => candidate.id === ctx.params.id)
  if (address === undefined) {
    throw new ResponseError(notFound('No existe esa dirección en tu libreta.'))
  }
  return address
}

/** Rutas de la cuenta del cliente: sesión, contraseña, datos, pedidos y direcciones. */
export const accountRoutes: readonly MockRoute[] = [
  route('GET', '/auth/csrf', (ctx) => {
    const session = currentSession(ctx) ?? startSession(ctx, null)
    return withSessionCookie(ctx, json({ csrfToken: session.csrfToken }), session)
  }),

  route('POST', '/auth/register', async (ctx) => {
    requireCsrf(ctx)
    const input = parseOrFail(registerSchema, await ctx.body())
    if (ctx.db.customers.some((customer) => customer.email === input.email)) {
      return problem(409, 'El email ya tiene una cuenta', {
        type: 'email_already_registered',
        detail: 'Ya existe una cuenta con ese email. Iniciá sesión o recuperá tu contraseña.',
      })
    }
    const customer: MockCustomer = {
      id: `cus-${String(ctx.db.customers.length + 1).padStart(4, '0')}`,
      ...input,
      phone: null,
      addresses: [],
      passwordResetRequestedAt: null,
      createdAt: ctx.now.toISOString(),
    }
    ctx.db.customers.push(customer)
    // Los pedidos de invitado hechos con el mismo email pasan a la cuenta nueva.
    for (const order of ctx.db.orders) {
      if (order.ownerId === null && order.customer.email === customer.email) {
        order.ownerId = customer.id
      }
    }
    return withSessionCookie(ctx, json(toCustomer(customer), 201), startSession(ctx, customer.id))
  }),

  route('POST', '/auth/login', async (ctx) => {
    requireCsrf(ctx)
    const input = parseOrFail(loginSchema, await ctx.body())
    const customer = ctx.db.customers.find(
      (candidate) => candidate.email === input.email && candidate.password === input.password,
    )
    if (customer === undefined) {
      return problem(401, 'Credenciales incorrectas', {
        type: 'invalid_credentials',
        detail: 'Email o contraseña incorrectos.',
      })
    }
    return withSessionCookie(ctx, json(toCustomer(customer)), startSession(ctx, customer.id))
  }),

  route('POST', '/auth/logout', (ctx) => {
    const { session } = requireCustomer(ctx, { csrf: true })
    endSession(ctx, session)
    return withSessionCookie(ctx, noContent(), null)
  }),

  route('POST', '/auth/password/forgot', async (ctx) => {
    requireCsrf(ctx)
    const { email } = parseOrFail(forgotPasswordSchema, await ctx.body())
    const customer = ctx.db.customers.find((candidate) => candidate.email === email)
    if (customer !== undefined) customer.passwordResetRequestedAt = ctx.now.toISOString()
    return new Response(null, { status: 202 })
  }),

  route('POST', '/auth/password/reset', async (ctx) => {
    requireCsrf(ctx)
    const input = parseOrFail(resetPasswordSchema, await ctx.body())
    const customer = ctx.db.customers
      .filter((candidate) => candidate.passwordResetRequestedAt !== null)
      .sort((a, b) =>
        (b.passwordResetRequestedAt ?? '').localeCompare(a.passwordResetRequestedAt ?? ''),
      )[0]
    if (input.token !== MOCK_PASSWORD_RESET_TOKEN || customer === undefined) {
      return validationProblem([
        {
          field: 'token',
          code: 'invalid_token',
          message: 'El enlace para cambiar la contraseña no es válido o ya venció.',
        },
      ])
    }
    customer.password = input.password
    customer.passwordResetRequestedAt = null
    // Cambiar la contraseña cierra las sesiones abiertas de esa cuenta.
    ctx.db.customerSessions = ctx.db.customerSessions.filter(
      (session) => session.customerId !== customer.id,
    )
    return noContent()
  }),

  route('GET', '/me', (ctx) => json(toCustomer(requireCustomer(ctx, { csrf: false }).customer))),

  route('PATCH', '/me', async (ctx) => {
    const { customer } = requireCustomer(ctx, { csrf: true })
    const changes = parseOrFail(customerUpdateSchema, await ctx.body())
    if (
      changes.firstName === undefined &&
      changes.lastName === undefined &&
      changes.phone === undefined
    ) {
      return validationProblem([
        { field: '', code: 'too_small', message: 'Mandá al menos un dato para cambiar.' },
      ])
    }
    if (changes.firstName !== undefined) customer.firstName = changes.firstName
    if (changes.lastName !== undefined) customer.lastName = changes.lastName
    if (changes.phone !== undefined) customer.phone = changes.phone
    return json(toCustomer(customer))
  }),

  route('GET', '/me/orders', (ctx) => {
    const { customer } = requireCustomer(ctx, { csrf: false })
    const reader = new QueryReader(ctx.query)
    const page = reader.integer('page', 'La página', { min: 1 }, 1)
    reader.assertValid()
    expireOrders(ctx.db, ctx.now)
    const owned = ctx.db.orders
      .filter((order) => order.ownerId === customer.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.number.localeCompare(a.number))
    const start = (page - 1) * MY_ORDERS_PAGE_SIZE
    return json({
      items: owned.slice(start, start + MY_ORDERS_PAGE_SIZE).map(toOrderSummary),
      page,
      pageSize: MY_ORDERS_PAGE_SIZE,
      total: owned.length,
    })
  }),

  route('GET', '/me/orders/{number}', (ctx) => {
    const { customer } = requireCustomer(ctx, { csrf: false })
    const number = orderNumberParam(ctx.params)
    expireOrders(ctx.db, ctx.now)
    const order = ctx.db.orders.find(
      (candidate) => candidate.number === number && candidate.ownerId === customer.id,
    )
    if (order === undefined) throw orderNotFound()
    return json(toOrder(order))
  }),

  route('GET', '/me/addresses', (ctx) =>
    json(sortedAddresses(requireCustomer(ctx, { csrf: false }).customer)),
  ),

  route('POST', '/me/addresses', async (ctx) => {
    const { customer } = requireCustomer(ctx, { csrf: true })
    const address: Address = { id: `adr-${randomUuid()}`, ...(await readAddress(ctx)) }
    saveAddress(customer, address)
    return json(address, 201)
  }),

  route('PATCH', '/me/addresses/{id}', async (ctx) => {
    const { customer } = requireCustomer(ctx, { csrf: true })
    const { id } = addressOf(ctx, customer)
    const address: Address = { id, ...(await readAddress(ctx)) }
    saveAddress(customer, address)
    return json(address)
  }),

  route('DELETE', '/me/addresses/{id}', (ctx) => {
    const { customer } = requireCustomer(ctx, { csrf: true })
    const { id } = addressOf(ctx, customer)
    customer.addresses = customer.addresses.filter((address) => address.id !== id)
    return noContent()
  }),
]
