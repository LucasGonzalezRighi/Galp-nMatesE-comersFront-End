'use client'

import type { ReactNode } from 'react'
import { cx } from '@/components/ui/cx'
import type { KitStepStatus, KitStepView } from './kit-view'
import type { KitStep } from './kit.store'
import { KIT_COPY } from './kit.copy'

/** Props de {@link KitSteps}. */
export interface KitStepsProps {
  /** Los cuatro pasos, con su estado. */
  steps: readonly KitStepView[]
  /** Avance de la línea de cobre, de 0 a 1. */
  progress: number
  /** Se llama al tocar un paso: se puede ir a cualquiera, también al Resumen. */
  onSelect: (step: KitStep) => void
}

/** Círculo de cada estado: el actual brilla, el resuelto va en cobre oscuro y el pendiente es liso. */
const MARK_CLASSES: Record<KitStepStatus, string> = {
  current:
    'bg-accent text-background shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-accent)_25%,transparent),0_0_20px_var(--color-accent)]',
  done: 'bg-accent-800 text-accent-100 shadow-[0_0_0_1px_var(--color-neutral-700)]',
  idle: 'bg-background text-neutral-400 shadow-[0_0_0_1px_var(--color-neutral-700)]',
}

/**
 * Barra de pasos del kit (Mate, Bombilla, Yerba y Resumen): una línea con su avance y, por paso,
 * el círculo con el número (o el tilde), el nombre y qué se eligió. Cada paso es un botón y se
 * puede tocar en cualquier orden.
 *
 * @param props - Ver {@link KitStepsProps}.
 */
export function KitSteps({ steps, progress, onSelect }: KitStepsProps): ReactNode {
  return (
    <nav
      aria-label={KIT_COPY.stepsLabel}
      className="mx-auto max-w-[1280px] px-[clamp(20px,5vw,64px)]"
    >
      <div className="relative grid grid-cols-4 gap-2">
        <div aria-hidden="true" className="absolute inset-x-0 top-[15px] h-px bg-neutral-800" />
        <div
          aria-hidden="true"
          className="bg-accent ease-main absolute inset-x-0 top-[15px] h-px origin-left shadow-[0_0_12px_var(--color-accent)] transition-transform duration-[800ms] motion-reduce:transition-none"
          style={{ transform: `scaleX(${progress.toFixed(3)})` }}
        />
        {steps.map((step) => (
          <button
            key={step.index}
            type="button"
            aria-current={step.status === 'current' ? 'step' : undefined}
            onClick={() => {
              onSelect(step.index)
            }}
            className="relative flex min-w-0 cursor-pointer flex-col items-start gap-[10px] border-0 bg-transparent p-0 text-left text-inherit"
          >
            <span
              aria-hidden="true"
              className={cx(
                'grid size-[31px] place-items-center rounded-full text-[11px] tabular-nums transition-all duration-[450ms] motion-reduce:transition-none',
                MARK_CLASSES[step.status],
              )}
            >
              {step.mark}
            </span>
            <span
              className={cx(
                'text-[14px]',
                step.status === 'current' ? 'text-foreground' : 'text-neutral-400',
              )}
            >
              {step.label}
            </span>
            <span className="block max-w-full truncate text-[12px] text-neutral-500">
              {step.detail}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}
