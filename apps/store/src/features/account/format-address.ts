import type { AddressInput, BranchAddressInput } from '@galpon/api-client'

/**
 * Las dos líneas con que se muestra una dirección: calle, número y depto, y código postal,
 * ciudad y provincia. Una dirección de sucursal (sin calle) tiene solo la segunda.
 *
 * @param address - Dirección de la libreta o del envío de un pedido.
 * @returns Las líneas, listas para mostrar.
 * @example
 * formatAddressLines({ street: 'Av. Corrientes', number: '1234', apartment: '5° B', postalCode: 'C1043', city: 'CABA', province: 'CABA' })
 * // ["Av. Corrientes 1234, 5° B", "C1043 CABA, CABA"]
 */
export function formatAddressLines(address: AddressInput | BranchAddressInput): string[] {
  const place = `${address.postalCode} ${address.city}, ${address.province}`
  if (!('street' in address)) return [place]
  const street = `${address.street} ${address.number}`
  return [address.apartment === null ? street : `${street}, ${address.apartment}`, place]
}
