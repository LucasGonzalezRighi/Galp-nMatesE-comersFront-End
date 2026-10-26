import type { CartLine } from '@galpon/domain'
import { assertValidQuantity, cartLineKey } from '@galpon/domain'

/**
 * Hash de 53 bits (cyrb53) de un texto: no es criptográfico, solo sirve para comparar carritos
 * sin guardar su contenido. Es determinista y no cambia entre versiones, porque el checkout lo
 * guarda en `sessionStorage` y lo compara después de recargar.
 *
 * @param text - Texto a resumir.
 * @returns 14 dígitos hexadecimales.
 */
function hash53(text: string): string {
  let first = 0xdeadbeef
  let second = 0x41c6ce57
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index)
    first = Math.imul(first ^ code, 2654435761)
    second = Math.imul(second ^ code, 1597334677)
  }
  first =
    Math.imul(first ^ (first >>> 16), 2246822507) ^ Math.imul(second ^ (second >>> 13), 3266489909)
  second =
    Math.imul(second ^ (second >>> 16), 2246822507) ^ Math.imul(first ^ (first >>> 13), 3266489909)
  return (4294967296 * (second & 2097151) + (first >>> 0)).toString(16).padStart(14, '0')
}

/**
 * Resume el contenido del carrito (qué líneas hay y cuántas unidades de cada una) en un valor
 * corto y estable. El checkout lo guarda junto al pedido para saber si el carrito cambió desde
 * entonces: con el mismo valor se puede reutilizar el pedido; con otro hay que crear uno nuevo.
 *
 * No depende del orden de las líneas y no incluye precios: un cambio de precio lo informa la
 * cotización de la API (`price_changed`), no este valor.
 *
 * @param lines - Líneas del carrito.
 * @returns 14 dígitos hexadecimales.
 * @throws {RangeError} Si la cantidad de alguna línea no es un entero mayor o igual a 1.
 * @example
 * cartHash(useCartStore.getState().lines) // "1f3a9c0b7d24e5"
 */
export function cartHash(lines: readonly CartLine[]): string {
  const entries = lines.map((line) => {
    assertValidQuantity(line.quantity)
    return `${cartLineKey(line)}*${String(line.quantity)}`
  })
  return hash53(entries.sort().join('|'))
}
