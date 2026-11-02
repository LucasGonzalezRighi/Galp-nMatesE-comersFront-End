import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import type { CartLine } from '@galpon/domain'
import { addCartLine, removeCartLine, setCartLineQuantity } from '@galpon/domain'
import type { SeenValues } from './reconcile'
import { cartUnitCount, parseCartLines } from './cart-lines'
import { EMPTY_SEEN, parseSeenValues } from './reconcile'

/** Clave de `localStorage` donde se guarda el carrito. */
export const CART_STORAGE_KEY = 'galpon.cart'

/** Versión del formato guardado; si cambia, `migrate` decide qué se rescata. */
export const CART_STORAGE_VERSION = 1

/** Lo que se guarda: solo ids y cantidades, más lo último visto para poder avisar de cambios. */
interface PersistedCart {
  /** Líneas del carrito. */
  lines: CartLine[]
  /** Últimos precios y descuento del kit vistos (solo para avisar; nunca se usan para calcular). */
  seen: SeenValues
}

/** Estado y acciones del carrito. */
export interface CartState extends PersistedCart {
  /** Si ya se leyó `localStorage`. Hasta entonces el contador y el panel no se muestran. */
  hasHydrated: boolean
  /** Si el panel del carrito está abierto. */
  isOpen: boolean
  /** Suma una línea; si ya hay una igual (misma clave), suma las cantidades. */
  addLine: (line: CartLine, seen?: Partial<SeenValues>) => void
  /** Cambia la cantidad de una línea; con 0 o menos la quita. */
  setLineQuantity: (key: string, quantity: number) => void
  /** Quita una línea. */
  removeLine: (key: string) => void
  /** Reemplaza las líneas y lo visto (resultado de conciliar con el catálogo). */
  replaceLines: (lines: CartLine[], seen: SeenValues) => void
  /** Vacía el carrito (por ejemplo, después de pagar). */
  clear: () => void
  /** Abre o cierra el panel. */
  setOpen: (open: boolean) => void
  /** Marca que la lectura de `localStorage` terminó (con o sin datos). */
  markHydrated: () => void
}

/**
 * Store del carrito (Zustand + `persist`, spec 9.4). Se guarda en `localStorage` con la clave
 * `galpon.cart` y la versión 1. Usa `skipHydration`: nada se lee hasta que `CartHydrator` llama a
 * `persist.rehydrate()` en un efecto, así el servidor y la primera pintura del cliente coinciden.
 *
 * Lo guardado se valida línea por línea al leerlo (`merge`), así datos viejos o corruptos no
 * rompen la página. Si `localStorage` no está disponible (navegación privada, políticas del
 * navegador), el carrito sigue funcionando en memoria.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      seen: EMPTY_SEEN,
      hasHydrated: false,
      isOpen: false,
      addLine: (line, seen) => {
        set((state) => ({
          lines: addCartLine(state.lines, line),
          seen:
            seen === undefined
              ? state.seen
              : {
                  prices: { ...state.seen.prices, ...seen.prices },
                  kitDiscountPercent: seen.kitDiscountPercent ?? state.seen.kitDiscountPercent,
                },
        }))
      },
      setLineQuantity: (key, quantity) => {
        set((state) => ({ lines: setCartLineQuantity(state.lines, key, quantity) }))
      },
      removeLine: (key) => {
        set((state) => ({ lines: removeCartLine(state.lines, key) }))
      },
      replaceLines: (lines, seen) => {
        set({ lines, seen })
      },
      clear: () => {
        set({ lines: [], seen: EMPTY_SEEN })
      },
      setOpen: (open) => {
        set({ isOpen: open })
      },
      markHydrated: () => {
        set({ hasHydrated: true })
      },
    }),
    {
      name: CART_STORAGE_KEY,
      version: CART_STORAGE_VERSION,
      skipHydration: true,
      // Si no hay `localStorage` (servidor, modo privado), devuelve `undefined` y queda en memoria.
      storage: createJSONStorage<PersistedCart>(() => localStorage),
      partialize: (state): PersistedCart => ({ lines: state.lines, seen: state.seen }),
      // Un formato anterior que no se conoce no se rescata: el carrito empieza vacío.
      migrate: (): PersistedCart => ({ lines: [], seen: EMPTY_SEEN }),
      merge: (persisted, current) => {
        const stored = typeof persisted === 'object' && persisted !== null ? persisted : {}
        const seen = parseSeenValues('seen' in stored ? stored.seen : undefined)
        return {
          ...current,
          // Lo que se sumó antes de terminar de leer se conserva encima de lo guardado.
          lines: current.lines.reduce(
            (lines, line) => addCartLine(lines, line),
            parseCartLines('lines' in stored ? stored.lines : undefined),
          ),
          seen: {
            prices: { ...seen.prices, ...current.seen.prices },
            kitDiscountPercent: current.seen.kitDiscountPercent ?? seen.kitDiscountPercent,
          },
        }
      },
    },
  ),
)

/**
 * Lee `localStorage` y marca el carrito como hidratado, si todavía no se hizo. Es síncrona
 * (el almacenamiento es síncrono), así que sirve tanto para `CartHydrator` como para las
 * acciones que podrían correr antes: sumar al carrito sin leer antes pisaría lo guardado.
 */
export function ensureCartHydrated(): void {
  if (useCartStore.getState().hasHydrated) return
  void useCartStore.persist.rehydrate()
  useCartStore.getState().markHydrated()
}

/** Lo que devuelve {@link useCart}. */
export interface CartSnapshot {
  /** Líneas del carrito (vacías hasta hidratar). */
  lines: CartLine[]
  /** Unidades del carrito (cada kit cuenta como uno); 0 hasta hidratar. */
  count: number
  /** Si ya se leyó `localStorage`. */
  hasHydrated: boolean
  /** Si el panel del carrito está abierto. */
  isOpen: boolean
}

/**
 * Hook para leer el carrito desde un componente. Hasta que `CartHydrator` termina de leer
 * `localStorage`, las líneas están vacías y `hasHydrated` es `false`: quien muestra el contador
 * o el panel tiene que esperar a `hasHydrated` para no desajustar la hidratación.
 *
 * @example
 * const { count, hasHydrated } = useCart()
 */
export function useCart(): CartSnapshot {
  return useCartStore(
    useShallow((state) => ({
      lines: state.lines,
      count: cartUnitCount(state.lines),
      hasHydrated: state.hasHydrated,
      isOpen: state.isOpen,
    })),
  )
}
