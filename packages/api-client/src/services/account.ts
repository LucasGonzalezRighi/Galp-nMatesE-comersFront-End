import type { ApiClient } from '../client'
import type {
  Address,
  AddressBookInput,
  CsrfToken,
  Customer,
  CustomerUpdate,
  ForgotPasswordInput,
  LoginInput,
  Order,
  OrderSummaryPage,
  RegisterInput,
  ResetPasswordInput,
} from '../generated/schema'
import { unwrap, unwrapVoid } from '../unwrap'
import { assertAddressId, assertOrderNumber, assertPage } from './validation'

/**
 * Pide el token anti-CSRF de la sesión actual de la tienda (y la abre si no hay). Hay que volver
 * a pedirlo al cargar la tienda y después de iniciar o cerrar sesión.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Si la llamada falla.
 */
export function getCustomerCsrfToken(api: ApiClient): Promise<CsrfToken> {
  return unwrap(api.GET('/auth/csrf'))
}

/**
 * Crea la cuenta e inicia la sesión. Los pedidos de invitado con el mismo email pasan a la cuenta.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param input - Email, nombre, apellido y contraseña.
 * @throws {ApiError} Si la llamada falla (`conflict` si el email ya tiene cuenta, `validation`
 *   con el mensaje de cada campo).
 */
export function register(api: ApiClient, input: RegisterInput): Promise<Customer> {
  return unwrap(api.POST('/auth/register', { body: input }))
}

/**
 * Inicia la sesión del cliente.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param input - Email y contraseña.
 * @throws {ApiError} Con `unauthorized` si el email o la contraseña no son correctos.
 */
export function login(api: ApiClient, input: LoginInput): Promise<Customer> {
  return unwrap(api.POST('/auth/login', { body: input }))
}

/**
 * Cierra la sesión del cliente.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @throws {ApiError} Con `unauthorized` si no había sesión.
 */
export function logout(api: ApiClient): Promise<void> {
  return unwrapVoid(api.POST('/auth/logout'))
}

/**
 * Pide el enlace para elegir una contraseña nueva. Responde igual exista o no la cuenta.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param input - Email de la cuenta.
 * @throws {ApiError} Si la llamada falla.
 */
export function forgotPassword(api: ApiClient, input: ForgotPasswordInput): Promise<void> {
  return unwrapVoid(api.POST('/auth/password/forgot', { body: input }))
}

/**
 * Elige una contraseña nueva con el token del enlace.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param input - Token del enlace y contraseña nueva.
 * @throws {ApiError} Con `validation` en el campo `token` si el enlace no sirve.
 */
export function resetPassword(api: ApiClient, input: ResetPasswordInput): Promise<void> {
  return unwrapVoid(api.POST('/auth/password/reset', { body: input }))
}

/**
 * Trae los datos del cliente con la sesión iniciada.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Con `unauthorized` si no hay sesión.
 */
export function getMe(api: ApiClient): Promise<Customer> {
  return unwrap(api.GET('/me'))
}

/**
 * Cambia el nombre, el apellido o el teléfono (`phone: null` lo borra).
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param input - Solo los datos que cambian.
 * @throws {ApiError} Si la llamada falla.
 */
export function updateMe(api: ApiClient, input: CustomerUpdate): Promise<Customer> {
  return unwrap(api.PATCH('/me', { body: input }))
}

/**
 * Lista los pedidos del cliente, del más nuevo al más viejo, de a 10.
 *
 * @param api - Cliente de la API.
 * @param page - Número de página, empezando en 1; sin él, la primera.
 * @throws {RangeError} Si la página no es un entero mayor o igual a 1.
 * @throws {ApiError} Con `unauthorized` si no hay sesión.
 */
export async function listMyOrders(api: ApiClient, page?: number): Promise<OrderSummaryPage> {
  if (page !== undefined) assertPage(page)
  return unwrap(api.GET('/me/orders', { params: { query: { page } } }))
}

/**
 * Trae uno de los pedidos del cliente.
 *
 * @param api - Cliente de la API.
 * @param number - Número del pedido.
 * @throws {RangeError} Si el número no es `GLP-` y cinco dígitos.
 * @throws {ApiError} Con `not_found` si no es del cliente.
 */
export async function getMyOrder(api: ApiClient, number: string): Promise<Order> {
  assertOrderNumber(number)
  return unwrap(api.GET('/me/orders/{number}', { params: { path: { number } } }))
}

/**
 * Lista la libreta de direcciones, con la predeterminada primero.
 *
 * @param api - Cliente de la API.
 * @throws {ApiError} Con `unauthorized` si no hay sesión.
 */
export function listMyAddresses(api: ApiClient): Promise<Address[]> {
  return unwrap(api.GET('/me/addresses'))
}

/**
 * Guarda una dirección; si es la predeterminada, la anterior deja de serlo.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param input - Dirección completa.
 * @throws {ApiError} Si la llamada falla (`validation` con el mensaje de cada campo).
 */
export function createMyAddress(api: ApiClient, input: AddressBookInput): Promise<Address> {
  return unwrap(api.POST('/me/addresses', { body: input }))
}

/**
 * Reemplaza los datos de una dirección de la libreta.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param id - Identificador de la dirección.
 * @param input - Dirección completa.
 * @throws {RangeError} Si el identificador no sirve para armar la ruta.
 * @throws {ApiError} Si la llamada falla (`not_found` si no es del cliente).
 */
export async function updateMyAddress(
  api: ApiClient,
  id: string,
  input: AddressBookInput,
): Promise<Address> {
  assertAddressId(id)
  return unwrap(api.PATCH('/me/addresses/{id}', { params: { path: { id } }, body: input }))
}

/**
 * Borra una dirección de la libreta.
 *
 * @param api - Cliente de la API (con `getCsrfToken`).
 * @param id - Identificador de la dirección.
 * @throws {RangeError} Si el identificador no sirve para armar la ruta.
 * @throws {ApiError} Si la llamada falla (`not_found` si no es del cliente).
 */
export async function deleteMyAddress(api: ApiClient, id: string): Promise<void> {
  assertAddressId(id)
  return unwrapVoid(api.DELETE('/me/addresses/{id}', { params: { path: { id } } }))
}
