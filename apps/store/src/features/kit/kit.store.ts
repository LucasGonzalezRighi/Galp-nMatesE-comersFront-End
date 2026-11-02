import { create } from 'zustand'
import type { Leather, ProductGroup } from '@galpon/domain'
import { DEFAULT_LEATHER, isLeather, KIT_GROUP_ORDER } from '@galpon/domain'

/** Cuánto tarda en avanzar al paso siguiente después de elegir una pieza, en milisegundos (spec 9.4). */
export const KIT_ADVANCE_DELAY_MS = 420

/** Paso del kit: 0 Mate, 1 Bombilla, 2 Yerba y 3 Resumen. */
export type KitStep = 0 | 1 | 2 | 3

/** Cantidad de pasos del kit (los tres grupos y el Resumen). */
export const KIT_STEP_COUNT = 4

/** Último paso, el Resumen. */
export const KIT_REVIEW_STEP: KitStep = 3

/** Id de la pieza elegida en cada grupo; los grupos sin elegir faltan. */
export type KitPicks = Partial<Record<ProductGroup, string>>

/** Estado y acciones del kit: vive en memoria y no se guarda (spec 9.4). */
export interface KitState {
  /** Paso que se muestra. */
  step: KitStep
  /** Piezas elegidas. */
  picks: KitPicks
  /** Cuero del mate; no se reinicia con el kit. */
  leather: Leather
  /** Va a un paso, sin orden obligatorio (también al Resumen). Cancela el avance automático pendiente. */
  goToStep: (step: number) => void
  /** Elige una pieza y, a los 420 ms, pasa al paso siguiente si no se cambió de paso mientras tanto. */
  pickPiece: (group: ProductGroup, productId: string) => void
  /** Elige el cuero del mate. */
  setLeather: (leather: string) => void
  /** Elige el mate que llegó por `/kit?mate=`, conserva las otras piezas y abre en Bombilla. */
  chooseMateFromLink: (productId: string) => void
  /** Reinicia las piezas y el paso, pero no el cuero ("Empezar de nuevo" y "Agregar kit"). */
  reset: () => void
}

/** Temporizador del avance automático; hay uno solo porque se elige una pieza a la vez. */
let advanceTimer: ReturnType<typeof setTimeout> | undefined

/** Cancela el avance automático pendiente, si hay. */
function cancelAdvance(): void {
  if (advanceTimer !== undefined) {
    clearTimeout(advanceTimer)
    advanceTimer = undefined
  }
}

/** Paso que sigue a cada uno; el Resumen es el último. */
const NEXT_STEP: Record<KitStep, KitStep> = { 0: 1, 1: 2, 2: 3, 3: 3 }

/** Indica si un número es un paso válido del kit. */
function isKitStep(value: number): value is KitStep {
  return Number.isInteger(value) && value >= 0 && value < KIT_STEP_COUNT
}

/** Indica si un texto es uno de los grupos del kit. */
function isKitGroup(value: string): value is ProductGroup {
  return (KIT_GROUP_ORDER as readonly string[]).includes(value)
}

/** Valida que el id de un producto no esté vacío. */
function assertProductId(productId: string): void {
  if (productId.trim() === '') {
    throw new RangeError('El id de la pieza no puede estar vacío.')
  }
}

/**
 * Store del kit (Zustand, solo en memoria): paso actual, pieza elegida por grupo y cuero. Los
 * pasos se pueden recorrer libremente. Al elegir una pieza avanza solo a los 420 ms, y cambiar de
 * paso a mano, reiniciar o elegir el mate del link cancela ese avance.
 *
 * Los métodos validan sus datos y lanzan `RangeError` en español.
 */
export const useKitStore = create<KitState>()((set, get) => ({
  step: 0,
  picks: {},
  leather: DEFAULT_LEATHER,
  goToStep: (step) => {
    if (!isKitStep(step)) {
      throw new RangeError(
        `El paso del kit tiene que ser un entero entre 0 y ${String(KIT_STEP_COUNT - 1)}; se recibió ${String(step)}.`,
      )
    }
    cancelAdvance()
    set({ step })
  },
  pickPiece: (group, productId) => {
    if (!isKitGroup(group)) {
      throw new RangeError(`El grupo "${String(group)}" no es parte del kit.`)
    }
    assertProductId(productId)
    cancelAdvance()
    set((state) => ({ picks: { ...state.picks, [group]: productId } }))
    const next = NEXT_STEP[get().step]
    advanceTimer = setTimeout(() => {
      advanceTimer = undefined
      set({ step: next })
    }, KIT_ADVANCE_DELAY_MS)
  },
  setLeather: (leather) => {
    if (!isLeather(leather)) {
      throw new RangeError(`El cuero "${leather}" no existe.`)
    }
    set({ leather })
  },
  chooseMateFromLink: (productId) => {
    assertProductId(productId)
    cancelAdvance()
    set((state) => ({ picks: { ...state.picks, mate: productId }, step: 1 }))
  },
  reset: () => {
    cancelAdvance()
    set({ step: 0, picks: {} })
  },
}))
