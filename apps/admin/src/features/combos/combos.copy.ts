import type { ComboStatus, ProductGroup } from '@galpon/domain'
import { formatPesos, pesos } from '@galpon/domain'
import type { ComboWarning } from './combo-warnings'

/** Textos de la pantalla de combos y de sus diálogos. */
export const COMBOS_COPY = {
  title: 'Combos',
  description:
    'Arrastrá para cambiar el orden en que se muestran en el inicio de la tienda (hasta 6; de a 3 lucen mejor).',
  newCombo: 'Nuevo combo',
  /** Nombre de la lista reordenable (y comienzo del anuncio del orden). */
  listLabel: 'Combos',
  loading: 'Cargando los combos…',
  loadError: 'No pudimos cargar los combos.',
  empty: 'Todavía no hay combos.',
  emptyAction: 'Crear el primero',
  /** Estado de un combo, como se ve en la fila y en el formulario. */
  status: {
    draft: 'Borrador',
    published: 'Publicado',
  } satisfies Record<ComboStatus, string>,
  /** Avisos de la fila (ver `comboWarnings`). */
  warnings: {
    unavailable: 'Pieza no disponible',
    soldOut: 'Sin stock',
    noSavings: 'Sin ahorro',
  } satisfies Record<ComboWarning, string>,
  actions: {
    edit: 'Editar',
    delete: 'Borrar',
  },
  order: {
    saved: 'Orden guardado.',
    failed: 'No pudimos guardar el orden. Volvimos al anterior.',
  },
  form: {
    createTitle: 'Nuevo combo',
    editTitle: 'Editar combo',
    name: 'Nombre',
    description: 'Descripción',
    descriptionHint: 'Texto corto que acompaña el combo (hasta 300).',
    pieces: 'Piezas',
    piecesHint: 'Elegí 2 o 3, una de cada grupo.',
    /** Label de la lista de cada grupo. */
    groups: {
      mate: 'Mate',
      bombilla: 'Bombilla',
      yerba: 'Yerba',
    } satisfies Record<ProductGroup, string>,
    /** Primera opción de cada lista: el combo no lleva pieza de ese grupo. */
    none: {
      mate: 'Sin mate',
      bombilla: 'Sin bombilla',
      yerba: 'Sin yerba',
    } satisfies Record<ProductGroup, string>,
    loadingProducts: 'Cargando los productos…',
    productsError: 'No pudimos cargar los productos.',
    /** Ayuda de una lista con una pieza guardada que ya no se vende. */
    pieceUnavailable: 'Ya no está publicado o no tiene precio: elegí otro.',
    /** Ayuda de una lista con una pieza sin stock. */
    pieceSoldOut: 'Sin stock: el combo se ve agotado en la tienda.',
    price: 'Precio final',
    priceHint:
      'Lo que paga el cliente por el combo, con impuestos. Tiene que ser menor que la suma de las piezas.',
    summaryEmpty: 'Elegí las piezas para ver la suma y el ahorro.',
    /** Aviso en vivo con un precio que no es menor que la suma (el servidor lo rechaza). */
    priceNotBelowSum: 'El precio tiene que ser menor que la suma de las piezas.',
    status: 'Estado',
    save: 'Guardar',
    saving: 'Guardando…',
    cancel: 'Cancelar',
    created: 'Combo creado.',
    updated: 'Cambios guardados.',
    saveError: 'No pudimos guardar el combo. Probá de nuevo.',
  },
  discard: {
    title: '¿Descartar los cambios?',
    description: 'Lo que cambiaste en este combo no se guarda.',
    confirm: 'Descartar',
    keepEditing: 'Seguir editando',
  },
  remove: {
    description: 'La tienda deja de mostrarlo. Los pedidos que ya lo tienen guardan su copia.',
    confirm: 'Borrar',
    deleted: 'Combo borrado.',
    error: 'No pudimos borrar el combo. Probá de nuevo.',
  },
} as const

/**
 * Revisa que un texto que va dentro de un mensaje no esté vacío.
 *
 * @throws {RangeError} Si está vacío o tiene solo espacios.
 */
function assertText(value: string, name: string): void {
  if (value.trim() === '') throw new RangeError(`${name} no puede estar vacío.`)
}

/**
 * Nombre de la agarradera de un combo.
 *
 * @param name - Nombre del combo.
 * @returns "Arrastrar {nombre}".
 * @throws {RangeError} Si el nombre está vacío.
 */
export function dragLabel(name: string): string {
  assertText(name, 'El nombre del combo')
  return `Arrastrar ${name}`
}

/**
 * Nombre del botón que sube un combo un lugar.
 *
 * @param name - Nombre del combo.
 * @returns "Subir {nombre}".
 * @throws {RangeError} Si el nombre está vacío.
 */
export function moveUpLabel(name: string): string {
  assertText(name, 'El nombre del combo')
  return `Subir ${name}`
}

/**
 * Nombre del botón que baja un combo un lugar.
 *
 * @param name - Nombre del combo.
 * @returns "Bajar {nombre}".
 * @throws {RangeError} Si el nombre está vacío.
 */
export function moveDownLabel(name: string): string {
  assertText(name, 'El nombre del combo')
  return `Bajar ${name}`
}

/**
 * Nombre del menú de acciones de un combo.
 *
 * @param name - Nombre del combo.
 * @returns "Acciones de {nombre}".
 * @throws {RangeError} Si el nombre está vacío.
 */
export function actionsLabel(name: string): string {
  assertText(name, 'El nombre del combo')
  return `Acciones de ${name}`
}

/**
 * Pregunta del diálogo para borrar un combo.
 *
 * @param name - Nombre del combo.
 * @returns "¿Borrar el combo «{nombre}»?".
 * @throws {RangeError} Si el nombre está vacío.
 */
export function deleteTitle(name: string): string {
  assertText(name, 'El nombre del combo')
  return `¿Borrar el combo «${name}»?`
}

/**
 * Las piezas de un combo en una línea, como en la fila y en la tienda.
 *
 * @param names - Nombres de las piezas, en el orden del combo.
 * @returns Los nombres unidos con " + ".
 * @throws {RangeError} Si no hay piezas o un nombre está vacío.
 */
export function piecesText(names: readonly string[]): string {
  if (names.length === 0) throw new RangeError('El combo tiene que tener al menos una pieza.')
  for (const name of names) assertText(name, 'El nombre de la pieza')
  return names.join(' + ')
}

/**
 * Opción de una lista de piezas: el producto con su precio de lista.
 *
 * @param name - Nombre del producto.
 * @param priceArs - Precio de lista en pesos enteros.
 * @returns "{nombre} · $39.999".
 * @throws {RangeError} Si el nombre está vacío o el precio no es un entero de pesos desde 0.
 */
export function pieceOptionLabel(name: string, priceArs: number): string {
  assertText(name, 'El nombre de la pieza')
  return `${name} · ${formatPesos(pesos(priceArs))}`
}

/**
 * Opción de una pieza guardada en el combo que ya no está publicada o no tiene precio.
 *
 * @param name - Nombre del producto.
 * @returns "{nombre} (no disponible)".
 * @throws {RangeError} Si el nombre está vacío.
 */
export function unavailablePieceLabel(name: string): string {
  assertText(name, 'El nombre de la pieza')
  return `${name} (no disponible)`
}

/**
 * Resumen en vivo del formulario: la suma de las piezas elegidas y, con precio, el ahorro.
 *
 * @param listPriceArs - Suma de los precios de lista de las piezas.
 * @param savingsArs - Ahorro frente a las piezas sueltas, o `null` si todavía no hay precio.
 * @returns "Suma de las piezas $68.998 · Ahorro $6.999" o, sin precio, "Suma de las piezas
 *   $68.998".
 * @throws {RangeError} Si un monto no es un entero de pesos desde 0.
 */
export function summaryText(listPriceArs: number, savingsArs: number | null): string {
  const sum = `Suma de las piezas ${formatPesos(pesos(listPriceArs))}`
  return savingsArs === null ? sum : `${sum} · ${savingsText(savingsArs)}`
}

/**
 * Ahorro de un combo frente a comprar sus piezas sueltas.
 *
 * @param savingsArs - Ahorro en pesos enteros.
 * @returns "Ahorro $6.999".
 * @throws {RangeError} Si no es un entero de pesos desde 0.
 */
export function savingsText(savingsArs: number): string {
  return `Ahorro ${formatPesos(pesos(savingsArs))}`
}
