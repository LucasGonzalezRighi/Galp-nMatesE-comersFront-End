import { randomUuid } from './uuid'

/**
 * Titulares de prueba del sandbox de Mercado Pago: el nombre del titular decide el resultado del
 * pago. `3DS` es propio del modo de prueba y dispara la verificación 3-D Secure simulada.
 */
export const MOCK_CARD_HOLDERS = [
  'APRO',
  'CONT',
  'OTHE',
  'FUND',
  'SECU',
  'EXPI',
  'CALL',
  '3DS',
] as const

/** Titular de prueba que decide el resultado de un pago simulado. */
export type MockCardHolder = (typeof MOCK_CARD_HOLDERS)[number]

/** Datos con los que los campos simulados de tarjeta arman el token. */
export interface MockCardTokenInput {
  /** Nombre del titular como figura en la tarjeta; `APRO`, `CONT`, `3DS`… deciden el resultado. */
  cardholderName: string
  /** Últimos 4 dígitos de la tarjeta, si se conocen. */
  lastFour?: string
}

/** Lo que el mock lee de un token simulado. */
export interface MockCardToken {
  /** Titular de prueba; un nombre que no es de prueba cuenta como `OTHE`, como en el sandbox. */
  holder: MockCardHolder
  /** Últimos 4 dígitos, o `null` si el token no los trae. */
  lastFour: string | null
}

/** Prefijo de los tokens simulados. */
const PREFIX = 'sim'

/** Forma de un token simulado: `sim_<titular>_<últimos 4 o xxxx>_<32 hexadecimales>`. */
const TOKEN_PATTERN = /^sim_([A-Z0-9]+)_(\d{4}|xxxx)_[0-9a-f]{32}$/

/** Indica si un texto es uno de los titulares de prueba. */
function isMockCardHolder(value: string): value is MockCardHolder {
  return (MOCK_CARD_HOLDERS as readonly string[]).includes(value)
}

/**
 * Arma el token de un solo uso que mandan los campos simulados de tarjeta en lugar del de
 * MercadoPago.js. Codifica el titular de prueba (para que el mock decida el resultado) y los
 * últimos 4 dígitos; nunca el número entero, el vencimiento ni el código de seguridad.
 *
 * @param input - Titular y, si se conocen, los últimos 4 dígitos.
 * @returns Un token nuevo en cada llamada, por ejemplo `sim_APRO_4242_…`.
 * @throws {RangeError} Si el titular está vacío o `lastFour` no son 4 dígitos.
 * @example
 * createMockCardToken({ cardholderName: 'APRO', lastFour: '4242' })
 */
export function createMockCardToken(input: MockCardTokenInput): string {
  const name = input.cardholderName.trim().toUpperCase()
  if (name === '') {
    throw new RangeError('El nombre del titular no puede estar vacío.')
  }
  if (input.lastFour !== undefined && !/^\d{4}$/.test(input.lastFour)) {
    throw new RangeError('Los últimos dígitos de la tarjeta tienen que ser 4 números.')
  }
  const holder = isMockCardHolder(name) ? name : 'OTHE'
  return `${PREFIX}_${holder}_${input.lastFour ?? 'xxxx'}_${randomUuid().replaceAll('-', '')}`
}

/**
 * Lee un token armado con {@link createMockCardToken}.
 *
 * @param token - Token recibido en el pago con tarjeta.
 * @returns El titular y los últimos dígitos, o `null` si no es un token simulado.
 */
export function parseMockCardToken(token: string): MockCardToken | null {
  const match = TOKEN_PATTERN.exec(token)
  const holder = match?.[1]
  const lastFour = match?.[2]
  if (holder === undefined || lastFour === undefined || !isMockCardHolder(holder)) return null
  return { holder, lastFour: lastFour === 'xxxx' ? null : lastFour }
}
