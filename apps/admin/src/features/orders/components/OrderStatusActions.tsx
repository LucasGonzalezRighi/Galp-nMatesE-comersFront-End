import type { ReactNode } from 'react'
import { useState } from 'react'
import type { Order, OrderStatusChange } from '@galpon/api-client'
import type { AdminOrderTarget } from '@galpon/domain'
import { isApiError } from '@galpon/api-client'
import { adminOrderTargets, checkOrderTransition } from '@galpon/domain'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { toast } from '../../../components/ui/toast'
import { cancelTitle, deliverTitle, ORDERS_COPY } from '../orders.copy'
import { useOrderStatusChange } from '../use-order-status-change'
import { ShipOrderDialog } from './ShipOrderDialog'

/** Props de {@link OrderStatusActions}. */
export interface OrderStatusActionsProps {
  /** El pedido, tal como lo devolvió la API. */
  order: Order
}

/** Diálogo abierto: el de despacho o una confirmación. */
type OpenDialog = Exclude<AdminOrderTarget, 'preparing'> | null

/** Aviso de éxito de cada destino. */
const SUCCESS_TEXT: Record<AdminOrderTarget, string> = {
  preparing: ORDERS_COPY.actions.prepared,
  shipped: ORDERS_COPY.actions.shipped,
  delivered: ORDERS_COPY.actions.delivered,
  cancelled: ORDERS_COPY.actions.cancelled,
}

/**
 * Arma un cambio de estado que no es un despacho (sin empresa ni seguimiento).
 *
 * @param status - Destino.
 * @returns El cambio, con `carrier`, `trackingNumber` y `note` en `null`.
 */
function plainChange(status: Exclude<AdminOrderTarget, 'shipped'>): OrderStatusChange {
  return { status, carrier: null, trackingNumber: null, note: null }
}

/**
 * Botones para mover el pedido a los destinos de `adminOrderTargets` de `@galpon/domain`:
 * "Pasar a preparación" (sin confirmar), "Marcar como despachado" (diálogo con el seguimiento),
 * "Marcar como entregado" y "Cancelar pedido" (con `ConfirmDialog`). Con un pago en curso o sin
 * destinos lo explica en un texto. Mientras se guarda, todos quedan deshabilitados.
 *
 * @param props - Ver {@link OrderStatusActionsProps}.
 */
export function OrderStatusActions({ order }: OrderStatusActionsProps): ReactNode {
  const { number, status, paymentStatus } = order
  const mutation = useOrderStatusChange(number)
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const targets = adminOrderTargets(status, paymentStatus)
  const isPending = mutation.isPending

  function change(
    next: OrderStatusChange,
    setFieldErrors?: (errors: Readonly<Record<string, string>>) => void,
  ) {
    mutation.mutate(next, {
      onSuccess: () => {
        toast.success(SUCCESS_TEXT[next.status])
        setDialog(null)
      },
      onError: (error) => {
        if (!isApiError(error)) return
        // El pedido cambió en otro lado: el diálogo ya no corresponde (el toast dice por qué).
        if (error.kind === 'conflict') setDialog(null)
        if (error.kind === 'validation') setFieldErrors?.(error.fieldErrors)
      },
    })
  }

  function closeDialog(open: boolean) {
    if (!open) setDialog(null)
  }

  const inProgress =
    status === 'pending_payment' &&
    checkOrderTransition(status, paymentStatus, 'cancelled') === 'payment_in_progress'

  // Los diálogos quedan montados aunque ya no haya destinos: así se cierran con su transición
  // cuando el pedido recargado deja de ofrecer la acción.
  return (
    <>
      {targets.length === 0 && (
        <p className="text-sm text-neutral-400">
          {inProgress ? ORDERS_COPY.actions.paymentInProgress : ORDERS_COPY.actions.none}
        </p>
      )}
      {targets.includes('preparing') && (
        <Button
          variant="secondary"
          disabled={isPending}
          isLoading={isPending && mutation.variables.status === 'preparing'}
          onClick={() => {
            change(plainChange('preparing'))
          }}
        >
          {ORDERS_COPY.actions.prepare}
        </Button>
      )}
      {targets.includes('shipped') && (
        <Button
          disabled={isPending}
          onClick={() => {
            setDialog('shipped')
          }}
        >
          {ORDERS_COPY.actions.ship}
        </Button>
      )}
      {targets.includes('delivered') && (
        <Button
          disabled={isPending}
          onClick={() => {
            setDialog('delivered')
          }}
        >
          {ORDERS_COPY.actions.deliver}
        </Button>
      )}
      {targets.includes('cancelled') && (
        <Button
          variant="danger"
          disabled={isPending}
          onClick={() => {
            setDialog('cancelled')
          }}
        >
          {ORDERS_COPY.actions.cancel}
        </Button>
      )}
      <ShipOrderDialog
        number={number}
        open={dialog === 'shipped'}
        onOpenChange={closeDialog}
        isPending={isPending}
        onSubmit={change}
      />
      <ConfirmDialog
        open={dialog === 'delivered'}
        onOpenChange={closeDialog}
        title={deliverTitle(number)}
        description={ORDERS_COPY.actions.deliverDescription}
        confirmLabel={ORDERS_COPY.actions.deliver}
        tone="default"
        isPending={isPending}
        onConfirm={() => {
          change(plainChange('delivered'))
        }}
      />
      <ConfirmDialog
        open={dialog === 'cancelled'}
        onOpenChange={closeDialog}
        title={cancelTitle(number)}
        description={ORDERS_COPY.actions.cancelDescription}
        confirmLabel={ORDERS_COPY.actions.cancel}
        cancelLabel={ORDERS_COPY.actions.cancelBack}
        tone="danger"
        isPending={isPending}
        onConfirm={() => {
          change(plainChange('cancelled'))
        }}
      />
    </>
  )
}
