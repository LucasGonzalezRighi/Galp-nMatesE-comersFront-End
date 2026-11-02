import type { LineAmounts, Pesos, ProductGroup } from '@galpon/domain'
import { KIT_GROUP_ORDER, kitLineAmounts, missingKitGroups, pesos } from '@galpon/domain'
import type { KitProduct } from './kit-products'
import type { KitPicks, KitStep } from './kit.store'
import { GROUP_LABEL, KIT_COPY, missingCount } from './kit.copy'
import { KIT_REVIEW_STEP } from './kit.store'

/** Las piezas elegidas del kit; `null` si el grupo todavía no tiene o la pieza ya no se puede comprar. */
export type KitPieces = Record<ProductGroup, KitProduct | null>

/** Estado de un paso en la barra: el actual, uno ya resuelto o uno pendiente. */
export type KitStepStatus = 'current' | 'done' | 'idle'

/** Un paso de la barra superior. */
export interface KitStepView {
  /** Número del paso, de 0 a 3. */
  index: KitStep
  /** Nombre: "Mate", "Bombilla", "Yerba" o "Resumen". */
  label: string
  /** Marca del círculo: "01"… "04", o "✓" si ya está resuelto y no es el actual. */
  mark: string
  /** Texto de abajo: la pieza elegida, "Sin elegir", "Faltan N" o "Listo para agregar". */
  detail: string
  /** Si es el actual, está resuelto o está pendiente. */
  status: KitStepStatus
}

/** Una pieza en el panel y en la vista Resumen. */
export interface KitSlotView {
  /** Grupo de la pieza. */
  group: ProductGroup
  /** Etiqueta del grupo. */
  label: string
  /** La pieza elegida, o `null`. */
  product: KitProduct | null
}

/** Todo lo que muestra la pantalla del kit, calculado de las piezas, el paso y el catálogo. */
export interface KitView {
  /** Grupo que se está eligiendo, o `null` en el Resumen. */
  group: ProductGroup | null
  /** Opciones comprables del grupo actual, en el orden del catálogo. */
  options: KitProduct[]
  /** Las tres piezas, en el orden del kit. */
  slots: KitSlotView[]
  /** Los cuatro pasos de la barra. */
  steps: KitStepView[]
  /** Grupos sin pieza elegida. */
  missing: ProductGroup[]
  /** Si están las tres piezas. */
  isComplete: boolean
  /** Importes del kit: suma de las piezas elegidas, ahorro y total (con `kitLineAmounts`). */
  amounts: LineAmounts
  /** Avance de la línea de la barra, de 0 a 1. */
  progress: number
}

/** Entrada de {@link buildKitView}. */
export interface KitViewInput {
  /** Productos comprables que ofrece el kit. */
  products: readonly KitProduct[]
  /** Paso actual. */
  step: KitStep
  /** Piezas elegidas (ids). */
  picks: KitPicks
  /** Descuento del kit, un entero entre 0 y 30. */
  discountPercent: number
}

/** Indica si un producto sirve como opción de un grupo: del grupo, comprable y con precio. */
function isOption(product: KitProduct, group: ProductGroup): boolean {
  return product.group === group && product.isPurchasable && product.priceArs !== null
}

/**
 * Opciones del kit para un grupo: solo productos comprables, en el orden del catálogo.
 *
 * @param products - Productos del catálogo.
 * @param group - Grupo que se está eligiendo.
 * @returns Las opciones del grupo.
 */
export function kitOptions(products: readonly KitProduct[], group: ProductGroup): KitProduct[] {
  return products.filter((product) => isOption(product, group))
}

/**
 * Busca las piezas elegidas entre las opciones comprables. Una pieza que ya no está en el
 * catálogo o dejó de ser comprable cuenta como no elegida.
 *
 * @param products - Productos del catálogo.
 * @param picks - Ids elegidos por grupo.
 * @returns La pieza de cada grupo, o `null`.
 */
export function resolvePieces(products: readonly KitProduct[], picks: KitPicks): KitPieces {
  const find = (group: ProductGroup): KitProduct | null =>
    products.find((product) => product.id === picks[group] && isOption(product, group)) ?? null
  return { mate: find('mate'), bombilla: find('bombilla'), yerba: find('yerba') }
}

/**
 * Elige el mate de `/kit?mate={slug}`: solo sirve un mate comprable; cualquier otro valor
 * (vacío, otro grupo, sin stock, slug inexistente o raro) se ignora.
 *
 * @param slug - Valor del parámetro `mate`, o `null` si no vino.
 * @param products - Productos del catálogo.
 * @returns El mate, o `null` si no corresponde elegir ninguno.
 */
export function linkedMate(
  slug: string | null,
  products: readonly KitProduct[],
): KitProduct | null {
  if (slug === null || slug === '') return null
  return kitOptions(products, 'mate').find((product) => product.slug === slug) ?? null
}

/** Precio de lista de una pieza elegida, o 0 si el grupo todavía no tiene. */
function listPrice(product: KitProduct | null): Pesos {
  return pesos(product?.priceArs ?? 0)
}

/**
 * Calcula lo que muestra la pantalla del kit (spec 9.4 y 9.5): opciones del paso, estado de cada
 * paso, piezas e importes. Los importes salen de `kitLineAmounts` con las piezas elegidas (las
 * que faltan cuentan 0), así el panel se va armando mientras se elige.
 *
 * @param input - Ver {@link KitViewInput}.
 * @returns El estado de la pantalla.
 * @throws {RangeError} Si el descuento no es un entero entre 0 y 30.
 */
export function buildKitView({ products, step, picks, discountPercent }: KitViewInput): KitView {
  const pieces = resolvePieces(products, picks)
  const selection: KitPicks = {}
  for (const group of KIT_GROUP_ORDER) {
    const piece = pieces[group]
    if (piece !== null) selection[group] = piece.id
  }
  const missing = missingKitGroups(selection)
  const isComplete = missing.length === 0
  const group = KIT_GROUP_ORDER[step] ?? null

  const steps = ([0, 1, 2, 3] as const).map((index): KitStepView => {
    const stepGroup = KIT_GROUP_ORDER[index]
    const piece = stepGroup === undefined ? null : pieces[stepGroup]
    const done = stepGroup === undefined ? isComplete : piece !== null
    const current = index === step
    return {
      index,
      label: stepGroup === undefined ? KIT_COPY.summaryStep : GROUP_LABEL[stepGroup],
      mark: done && !current ? '✓' : String(index + 1).padStart(2, '0'),
      detail:
        stepGroup === undefined
          ? isComplete
            ? KIT_COPY.readyToAdd
            : missingCount(missing.length)
          : (piece?.name ?? KIT_COPY.unchosen),
      status: current ? 'current' : done ? 'done' : 'idle',
    }
  })

  return {
    group,
    options: group === null ? [] : kitOptions(products, group),
    slots: KIT_GROUP_ORDER.map((slotGroup) => ({
      group: slotGroup,
      label: GROUP_LABEL[slotGroup],
      product: pieces[slotGroup],
    })),
    steps,
    missing,
    isComplete,
    amounts: kitLineAmounts(
      [listPrice(pieces.mate), listPrice(pieces.bombilla), listPrice(pieces.yerba)],
      1,
      discountPercent,
    ),
    progress: step / KIT_REVIEW_STEP,
  }
}
