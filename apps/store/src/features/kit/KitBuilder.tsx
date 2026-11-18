'use client'

import type { MouseEvent, ReactNode } from 'react'
import { Suspense, useMemo, useRef } from 'react'
import { useScrollTopOnStep } from '@/components/motion'
import { cx } from '@/components/ui/cx'
import { KIT_GROUP_ORDER, resolveLeather } from '@galpon/domain'
import type { KitProduct } from './kit-products'
import { addKitPiecesToCart, addKitToCart, clickOrigin } from '../cart'
import { buildKitView, resolvePieces } from './kit-view'
import { useKitStore } from './kit.store'
import { KitMateLink } from './KitMateLink'
import { KitOptions } from './KitOptions'
import { KitReview } from './KitReview'
import { KitSteps } from './KitSteps'
import { KitSummary } from './KitSummary'

/** Props de {@link KitBuilder}. */
export interface KitBuilderProps {
  /** Productos comprables del catálogo (mates, bombillas y yerbas). */
  products: readonly KitProduct[]
  /** Descuento del kit (`PublicSettings.kitDiscountPercent`), un entero entre 0 y 30. */
  discountPercent: number
}

/** Ancho y márgenes laterales de la página (los del diseño). */
const CONTAINER = 'site-container'

/**
 * Asistente "Armá tu kit" (spec 9.4 y 9.5): barra de pasos, opciones comprables del paso o
 * vista Resumen, y el panel con el cuero, los importes y los botones. El estado vive en
 * `useKitStore` (en memoria): los pasos se recorren libremente, elegir una pieza avanza solo a
 * los 420 ms y al cambiar de paso la página sube con scroll suave y el foco pasa al título del
 * paso nuevo (WCAG 2.4.3).
 *
 * "Agregar kit al carrito" usa `addKitToCart` (respeta el tope de compra y abre el carrito a los
 * 850 ms) con el cuero preferido si el mate lo ofrece (si no, `resolveLeather` da el inicial, o
 * `null` si el mate no ofrece cueros): solo si se agregó, reinicia piezas y paso, y nunca el cuero
 * preferido. Si ya no hay stock para otro kit, las piezas quedan elegidas. Con una o dos piezas,
 * "Agregar al carrito" usa `addKitPiecesToCart` (Ruling AI-6): van como productos sueltos a
 * precio de lista, con el mismo cuero, y si se agregó alguna también reinicia el kit.
 *
 * @param props - Ver {@link KitBuilderProps}.
 * @throws {RangeError} Si el descuento no es un entero entre 0 y 30.
 */
export function KitBuilder({ products, discountPercent }: KitBuilderProps): ReactNode {
  const step = useKitStore((state) => state.step)
  const picks = useKitStore((state) => state.picks)
  const leather = useKitStore((state) => state.leather)
  // Las acciones del store no cambian nunca: se leen una vez.
  const { goToStep, pickPiece, setLeather, reset } = useKitStore.getState()
  const stepTitle = useRef<HTMLHeadingElement>(null)
  useScrollTopOnStep(step, stepTitle)

  const view = useMemo(
    () => buildKitView({ products, step, picks, discountPercent }),
    [products, step, picks, discountPercent],
  )

  const addKit = (event: MouseEvent<HTMLButtonElement>): void => {
    // Se lee el estado al momento del clic: un segundo clic seguido ya no encuentra el kit armado.
    const current = useKitStore.getState()
    const pieces = resolvePieces(products, current.picks)
    const chosen = KIT_GROUP_ORDER.flatMap((group) => pieces[group] ?? [])
    if (chosen.length === 0) return
    const { mate, bombilla, yerba } = pieces
    // El preferido si el mate lo ofrece; si no, el inicial; `null` si no ofrece cueros.
    const leather = mate === null ? null : resolveLeather(current.leather, mate.leathers)
    const origin = clickOrigin(event)
    const result =
      mate !== null && bombilla !== null && yerba !== null
        ? addKitToCart({ pieces: { mate, bombilla, yerba }, leather, discountPercent, origin })
        : // Con una o dos piezas van sueltas, a precio de lista (Ruling AI-6).
          addKitPiecesToCart({ pieces: chosen, leather, origin })
    if (result.status === 'added') reset()
  }

  return (
    <>
      <Suspense fallback={null}>
        <KitMateLink products={products} />
      </Suspense>
      <KitSteps steps={view.steps} progress={view.progress} onSelect={goToStep} />
      <section className={cx(CONTAINER, 'flex flex-wrap items-start gap-8 pt-10')}>
        <div className="min-w-0 flex-[2_1_520px]">
          {view.group === null ? (
            <KitReview
              headingRef={stepTitle}
              slots={view.slots}
              onSelect={(group) => {
                goToStep(KIT_GROUP_ORDER.indexOf(group))
              }}
            />
          ) : (
            <KitOptions
              headingRef={stepTitle}
              group={view.group}
              options={view.options}
              selectedId={picks[view.group]}
              onPick={(product) => {
                pickPiece(product.group, product.id)
              }}
            />
          )}
        </div>
        <KitSummary
          view={view}
          leather={leather}
          discountPercent={discountPercent}
          onLeather={setLeather}
          onAdd={addKit}
          onReset={reset}
        />
      </section>
    </>
  )
}
