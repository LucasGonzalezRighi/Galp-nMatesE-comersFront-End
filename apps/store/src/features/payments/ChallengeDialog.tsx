'use client'

import type { ReactNode } from 'react'
import { Button, Dialog } from '@/components/ui'
import { PAYMENTS_COPY } from './payments.copy'

/** Props de {@link ChallengeDialog}. */
export interface ChallengeDialogProps {
  /** Dirección del desafío (`challenge.url` del pago), o `null` para no mostrar el diálogo. */
  url: string | null
  /** Se llama al cerrar o al terminar la verificación: ahí se consulta el estado del pedido. */
  onClose: () => void
}

/**
 * Verificación 3-D Secure (spec 14.4): abre `challenge.url` en un iframe dentro de un diálogo
 * accesible titulado "Verificá tu compra con tu banco". Al cerrarlo (Escape, el fondo o "Ya
 * terminé") avisa con `onClose`, y quien lo usa consulta el estado del pedido.
 *
 * @param props - Ver {@link ChallengeDialogProps}.
 * @example
 * <ChallengeDialog url={result.challenge?.url ?? null} onClose={checkOrderStatus} />
 */
export function ChallengeDialog({ url, onClose }: ChallengeDialogProps): ReactNode {
  return (
    <Dialog open={url !== null} onClose={onClose} title={PAYMENTS_COPY.challengeTitle}>
      {url === null ? null : (
        <iframe
          title={PAYMENTS_COPY.challengeFrameTitle}
          src={url}
          referrerPolicy="no-referrer"
          className="h-[min(60vh,480px)] w-full rounded-md border-0"
        />
      )}
      <Button variant="secondary" onClick={onClose}>
        {PAYMENTS_COPY.challengeDone}
      </Button>
    </Dialog>
  )
}
