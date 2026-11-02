'use client'

import type { ReactNode } from 'react'
import { Magnetic } from '@/components/motion'
import { Button } from '@/components/ui'
import { CHECKOUT_COPY } from './checkout.copy'

/** Props de {@link StepActions}. */
export interface StepActionsProps {
  /** Vuelve al paso anterior; sin esto no se muestra "Volver". */
  onBack?: () => void
  /** El botón principal; por omisión "Continuar", que envía el formulario del paso. */
  children?: ReactNode
}

/**
 * Botones del pie de cada paso: "Volver" (secundario) y el principal, que ocupa el resto de la
 * fila con el imán del diseño.
 *
 * @param props - Ver {@link StepActionsProps}.
 */
export function StepActions({ onBack, children }: StepActionsProps): ReactNode {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {onBack === undefined ? null : (
        <Button variant="secondary" size="lg" className="min-h-[48px] px-[18px]" onClick={onBack}>
          {CHECKOUT_COPY.back}
        </Button>
      )}
      <div className="min-w-0 flex-[1_1_240px]">
        <Magnetic strength={0.2} reach={8} fullWidth>
          {children ?? (
            <Button
              type="submit"
              size="lg"
              fullWidth
              className="min-h-[50px] text-[15px] shadow-[0_0_32px_-10px_var(--color-accent)]"
            >
              {CHECKOUT_COPY.next}
            </Button>
          )}
        </Magnetic>
      </div>
    </div>
  )
}
