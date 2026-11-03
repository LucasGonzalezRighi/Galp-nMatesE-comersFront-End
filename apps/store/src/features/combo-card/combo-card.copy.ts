import type { Ferrule } from '@galpon/domain'
import { formatPesos, pesos, pluralize } from '@galpon/domain'

/** Microtextos de la tarjeta de combo (`research-design.md` §8, Ruling IC-12). */
export const COMBO_CARD_COPY = {
  /** Rótulo sobre el nombre. */
  eyebrow: 'Combo',
  /** Nombre accesible de la lista de piezas. */
  piecesList: 'Piezas del combo',
  /** Solo para lectores de pantalla, antes del precio final. */
  comboPrice: 'Precio del combo:',
  /** Solo para lectores de pantalla, antes del precio de lista tachado. */
  listPrice: 'Precio de lista:',
  /** Título de las opciones del mate. */
  leather: 'Cuero',
  ferrule: 'Virola',
  /** Botón de agregar. */
  add: 'Agregar combo',
  /** Etiqueta y botón de un combo sin stock, y precio de una pieza sin stock. */
  soldOut: 'Sin stock',
  /** Pista del botón cuando ya está en el carrito todo lo que se puede comprar de alguna pieza. */
  cartLimit: 'Ya tenés el máximo disponible en el carrito',
} as const

/** Nombres cortos de las virolas, para que entren las tres en la tarjeta de un celular. */
export const FERRULE_SHORT: Readonly<Record<Ferrule, string>> = {
  'Alpaca lisa': 'Lisa',
  'Alpaca cincelada': 'Cincelada',
  Acero: 'Acero',
}

/**
 * Chip verde del ahorro del combo.
 *
 * @param amount - Ahorro en pesos, entero mayor o igual a 0.
 * @returns "Ahorrás $6.999".
 * @throws {RangeError} Si el importe no es un entero de pesos mayor o igual a 0.
 */
export function savingsLabel(amount: number): string {
  return `Ahorrás ${formatPesos(pesos(amount))}`
}

/**
 * Cantidad de piezas, arriba a la derecha de las fotos.
 *
 * @param count - Piezas del combo, entero mayor o igual a 0.
 * @returns "2 piezas".
 * @throws {RangeError} Si la cantidad no es un entero mayor o igual a 0.
 */
export function piecesLabel(count: number): string {
  return pluralize(count, 'pieza', 'piezas')
}

/**
 * Nombre accesible del grupo de cueros, único en la página.
 *
 * @param mateName - Nombre del mate del combo.
 * @returns "Cuero del Mate Imperial Premium".
 */
export function leatherGroupLabel(mateName: string): string {
  return `Cuero del ${mateName}`
}

/**
 * Nombre accesible del grupo de virolas, único en la página.
 *
 * @param mateName - Nombre del mate del combo.
 * @returns "Virola del Mate Imperial Premium".
 */
export function ferruleGroupLabel(mateName: string): string {
  return `Virola del ${mateName}`
}

/**
 * Nombre accesible del botón de agregar: empieza con el texto visible (WCAG 2.5.3) y nombra el
 * combo, así cada botón de la página tiene un nombre propio.
 *
 * @param name - Nombre del combo.
 * @returns "Agregar combo Dúo Imperial al carrito".
 */
export function addComboLabel(name: string): string {
  return `${COMBO_CARD_COPY.add} ${name} al carrito`
}

/**
 * Nombre accesible del botón de un combo sin stock: empieza con el texto visible.
 *
 * @param name - Nombre del combo.
 * @returns "Sin stock: Dúo Imperial".
 */
export function soldOutComboLabel(name: string): string {
  return `${COMBO_CARD_COPY.soldOut}: ${name}`
}
