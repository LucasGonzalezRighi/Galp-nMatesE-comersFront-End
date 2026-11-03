import { z } from 'zod'
import type { AdminProduct, Combo } from '@galpon/api-client'
import type { Pesos, ProductGroup } from '@galpon/domain'
import { comboSavings, PRODUCT_GROUPS, pesos, sumPesos } from '@galpon/domain'
import { comboFormSchema } from '@galpon/schemas'

/** Largo máximo de la descripción de un combo (`comboFormSchema`). */
export const COMBO_DESCRIPTION_MAX_LENGTH = 300

/**
 * `comboFormSchema` con el precio vacío (`null`) mientras se escribe, así un combo nuevo arranca
 * sin precio. Un precio vacío da el mismo error que `comboFormSchema` ("Ingresá un precio en pesos
 * mayor a 0") y la salida es la misma: el combo listo para `ComboInput`.
 */
export const comboDialogSchema = comboFormSchema.extend({
  priceArs: z.number().nullable().pipe(comboFormSchema.shape.priceArs),
})

/** Valores del formulario de un combo, antes de validarlos. */
export type ComboDialogInput = z.input<typeof comboDialogSchema>

/** Lo que el formulario necesita de un producto publicado para ofrecerlo como pieza. */
export type PieceProduct = Pick<AdminProduct, 'id' | 'name' | 'group' | 'priceArs' | 'isSoldOut'>

/** Una pieza que se puede elegir en el formulario (o que ya estaba en el combo). */
export interface ComboPiece {
  /** Id del producto. */
  id: string
  /** Nombre del producto. */
  name: string
  /** Grupo del producto: decide en qué lista aparece. */
  group: ProductGroup
  /** Precio de lista vigente, o `null` si es "a consultar". */
  priceArs: Pesos | null
  /** Publicada y con precio: el servidor la acepta en un combo. */
  isAvailable: boolean
  /** Sin stock: el combo se ve agotado en la tienda. */
  isSoldOut: boolean
}

/** La pieza elegida en cada grupo: el id del producto, o `''` si el combo no lleva ese grupo. */
export type PiecesByGroup = Record<ProductGroup, string>

/** Lo que muestra el resumen en vivo del formulario. */
export interface ComboSummary {
  /** Suma de los precios de lista de las piezas elegidas que tienen precio. */
  listPriceArs: Pesos
  /** Ahorro con el precio escrito (`comboSavings`), o `null` si no hay precio o piezas. */
  savingsArs: Pesos | null
  /** El precio escrito no es menor que la suma: el servidor lo rechaza. */
  priceNotBelowSum: boolean
}

/**
 * Valores con los que arranca el formulario de un combo: vacío (sin piezas, sin precio y en
 * borrador) para uno nuevo, o los del combo que se edita, con sus piezas en el orden guardado.
 *
 * @param combo - El combo que se edita, o `null` para uno nuevo.
 * @returns Los valores iniciales para {@link comboDialogSchema}.
 */
export function comboFormValues(combo: Combo | null): ComboDialogInput {
  if (combo === null) {
    return { name: '', description: '', productIds: [], priceArs: null, status: 'draft' }
  }
  return {
    name: combo.name,
    description: combo.description,
    productIds: combo.items.map((item) => item.productId),
    priceArs: combo.priceArs,
    status: combo.status,
  }
}

/**
 * Piezas que ofrecen las listas del formulario: los productos publicados con precio y, al final,
 * las piezas guardadas en el combo que ya no lo están (marcadas como no disponibles), así una
 * lista no queda vacía sin avisar.
 *
 * @param products - Productos publicados (`adminProductsQuery` con `status: 'published'`).
 * @param combo - El combo que se edita, o `null` para uno nuevo.
 * @returns Las piezas, primero las disponibles en el orden de `products`.
 */
export function comboPieces(products: readonly PieceProduct[], combo: Combo | null): ComboPiece[] {
  const pieces: ComboPiece[] = products.flatMap((product) =>
    product.priceArs === null
      ? []
      : [
          {
            id: product.id,
            name: product.name,
            group: product.group,
            priceArs: pesos(product.priceArs),
            isAvailable: true,
            isSoldOut: product.isSoldOut,
          },
        ],
  )
  const ids = new Set(pieces.map((piece) => piece.id))
  for (const item of combo?.items ?? []) {
    if (ids.has(item.productId)) continue
    ids.add(item.productId)
    pieces.push({
      id: item.productId,
      name: item.name,
      group: item.group,
      priceArs: item.unitPriceArs === null ? null : pesos(item.unitPriceArs),
      isAvailable: false,
      isSoldOut: item.maxQuantity === 0,
    })
  }
  return pieces
}

/**
 * Reparte las piezas elegidas en las listas de cada grupo. Un id que no está entre las piezas se
 * ignora; si dos son del mismo grupo, queda la primera.
 *
 * @param productIds - Ids elegidos (`productIds` del formulario).
 * @param pieces - Piezas de {@link comboPieces}.
 * @returns El id elegido en cada grupo, o `''`.
 */
export function selectedByGroup(
  productIds: readonly string[],
  pieces: readonly ComboPiece[],
): PiecesByGroup {
  const selected: PiecesByGroup = { mate: '', bombilla: '', yerba: '' }
  for (const id of productIds) {
    const piece = pieces.find((candidate) => candidate.id === id)
    if (piece !== undefined && selected[piece.group] === '') selected[piece.group] = id
  }
  return selected
}

/**
 * Cambia la pieza de un grupo y devuelve los ids en el orden de los grupos (mate, bombilla,
 * yerba), que es el orden en que la tienda los muestra.
 *
 * @param productIds - Ids elegidos hasta ahora.
 * @param pieces - Piezas de {@link comboPieces}.
 * @param group - Grupo de la lista que cambió.
 * @param id - Id elegido en esa lista, o `''` para no llevar pieza de ese grupo.
 * @returns Los ids nuevos, sin los vacíos.
 * @throws {RangeError} Si `id` no es una de las piezas o no es de `group`.
 */
export function withPiece(
  productIds: readonly string[],
  pieces: readonly ComboPiece[],
  group: ProductGroup,
  id: string,
): string[] {
  if (id !== '') {
    const piece = pieces.find((candidate) => candidate.id === id)
    if (piece === undefined) throw new RangeError(`La pieza ${id} no se puede elegir.`)
    if (piece.group !== group) throw new RangeError(`La pieza ${id} no es del grupo ${group}.`)
  }
  const selected = { ...selectedByGroup(productIds, pieces), [group]: id }
  return PRODUCT_GROUPS.map((candidate) => selected[candidate]).filter((value) => value !== '')
}

/**
 * Resumen en vivo: la suma de lista de las piezas elegidas (las que tienen precio) y el ahorro
 * con el precio escrito, con las reglas del dominio (`sumPesos`, `comboSavings`).
 *
 * @param productIds - Ids elegidos.
 * @param pieces - Piezas de {@link comboPieces}.
 * @param priceArs - Precio escrito, o `null` si el campo está vacío.
 * @returns Ver {@link ComboSummary}.
 * @throws {RangeError} Si el precio no es un entero de pesos desde 0.
 */
export function comboSummary(
  productIds: readonly string[],
  pieces: readonly ComboPiece[],
  priceArs: number | null,
): ComboSummary {
  const prices = productIds.flatMap((id) => {
    const price = pieces.find((piece) => piece.id === id)?.priceArs ?? null
    return price === null ? [] : [price]
  })
  const listPriceArs = sumPesos(prices)
  if (priceArs === null || prices.length === 0) {
    return { listPriceArs, savingsArs: null, priceNotBelowSum: false }
  }
  const price = pesos(priceArs)
  return {
    listPriceArs,
    savingsArs: comboSavings(listPriceArs, price),
    priceNotBelowSum: price >= listPriceArs,
  }
}
