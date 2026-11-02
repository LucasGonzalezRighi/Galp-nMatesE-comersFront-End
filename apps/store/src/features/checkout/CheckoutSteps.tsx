'use client'

import type { ReactNode } from 'react'
import { cx } from '@/components/ui/cx'
import type { CheckoutStep } from './checkout.store'
import { CHECKOUT_COPY, stepNumber } from './checkout.copy'

/** Props de {@link CheckoutSteps}. */
export interface CheckoutStepsProps {
  /** Paso actual. */
  step: CheckoutStep
  /** Se llama al tocar un paso anterior. */
  onSelect: (step: CheckoutStep) => void
}

/** Los tres pasos, en orden. */
const STEPS: readonly CheckoutStep[] = [0, 1, 2]

/**
 * Barra de pasos del checkout (spec 14.1): "01 Contacto · 02 Envío · 03 Pago", cada uno con su
 * línea cobre que se llena al llegar. Solo se puede tocar un paso anterior; el actual y los
 * siguientes quedan deshabilitados.
 *
 * @param props - Ver {@link CheckoutStepsProps}.
 */
export function CheckoutSteps({ step, onSelect }: CheckoutStepsProps): ReactNode {
  return (
    <nav aria-label={CHECKOUT_COPY.stepsLabel}>
      <ol className="m-0 grid list-none grid-cols-3 gap-[10px] p-0">
        {STEPS.map((index) => {
          const reached = index <= step
          return (
            <li key={index}>
              <button
                type="button"
                disabled={index >= step}
                aria-current={index === step ? 'step' : undefined}
                onClick={() => {
                  onSelect(index)
                }}
                className={cx(
                  'flex w-full flex-col gap-2 border-0 bg-transparent p-0 text-left transition-colors duration-300 enabled:cursor-pointer motion-reduce:transition-none',
                  reached ? 'text-foreground' : 'text-neutral-500',
                )}
              >
                <span
                  aria-hidden="true"
                  className="relative h-[2px] overflow-hidden bg-neutral-800"
                >
                  <span
                    className="bg-accent ease-main absolute inset-0 origin-left transition-transform duration-700 motion-reduce:transition-none"
                    style={{ transform: `scaleX(${reached ? '1' : '0'})` }}
                  />
                </span>
                <span className="text-[13px]">
                  <span className="text-neutral-500 tabular-nums">{stepNumber(index)}</span>{' '}
                  {CHECKOUT_COPY.steps[index]}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
