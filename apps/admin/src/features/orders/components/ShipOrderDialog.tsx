import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useId } from 'react'
import { useForm } from 'react-hook-form'
import type { OrderStatusChange } from '@galpon/api-client'
import type { OrderStatusChangeForm, OrderStatusChangeFormInput } from '@galpon/schemas'
import { orderStatusChangeSchema } from '@galpon/schemas'
import type { ReturnFocusTarget } from '../../../components/ui/use-restore-focus'
import { Button } from '../../../components/ui/Button'
import { Dialog } from '../../../components/ui/Dialog'
import { Field } from '../../../components/ui/Field'
import { Textarea } from '../../../components/ui/Textarea'
import { TextInput } from '../../../components/ui/TextInput'
import { ORDER_NOTE_MAX_LENGTH } from '../orders.constants'
import { ORDERS_COPY, shipTitle } from '../orders.copy'

/** Campos del despacho que pueden traer un error del servidor (`422`). */
const SHIP_FIELDS = ['carrier', 'trackingNumber', 'note'] as const

/** Valores iniciales del formulario: siempre un despacho, con todo vacío. */
const DEFAULT_VALUES: OrderStatusChangeFormInput = {
  status: 'shipped',
  carrier: '',
  trackingNumber: '',
  note: '',
}

/** Props de {@link ShipOrderDialog}. */
export interface ShipOrderDialogProps {
  /** Número del pedido. */
  number: string
  /** Si está abierto. */
  open: boolean
  /** Se llama al abrir o cerrar; mientras se guarda no se cierra. */
  onOpenChange: (open: boolean) => void
  /** Mientras se guarda: el botón muestra "Guardando…" y los dos quedan deshabilitados. */
  isPending: boolean
  /**
   * Se llama con el despacho ya validado por `orderStatusChangeSchema`. Si el servidor responde
   * `422`, quien llama le pasa sus errores por campo a `setFieldErrors`.
   */
  onSubmit: (
    change: OrderStatusChange,
    setFieldErrors: (errors: Readonly<Record<string, string>>) => void,
  ) => void
  /**
   * Adónde va el foco al cerrarse, en lugar de "Marcar como despachado" (que desaparece cuando el
   * pedido queda despachado); `null` vuelve a ese botón.
   */
  returnFocusTo?: ReturnFocusTarget
}

/**
 * Diálogo "Despachar el pedido {número}": empresa de envío, número de seguimiento y nota
 * opcional, validados con `orderStatusChangeSchema` ("Requerido", 2–40 y 4–40 caracteres). Al
 * cerrarse vuelve a quedar vacío.
 *
 * @param props - Ver {@link ShipOrderDialogProps}.
 */
export function ShipOrderDialog({
  number,
  open,
  onOpenChange,
  isPending,
  onSubmit,
  returnFocusTo,
}: ShipOrderDialogProps): ReactNode {
  const formId = useId()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<OrderStatusChangeFormInput, undefined, OrderStatusChangeForm>({
    resolver: zodResolver(orderStatusChangeSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!open) reset(DEFAULT_VALUES)
  }, [open, reset])

  const submit = handleSubmit((change) => {
    onSubmit(change, (fieldErrors) => {
      for (const field of SHIP_FIELDS) {
        const message = fieldErrors[field]
        if (message !== undefined) setError(field, { message })
      }
    })
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isPending) onOpenChange(next)
      }}
      title={shipTitle(number)}
      returnFocusTo={returnFocusTo}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={isPending}
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {ORDERS_COPY.actions.dismiss}
          </Button>
          <Button type="submit" form={formId} isLoading={isPending}>
            {isPending ? ORDERS_COPY.actions.saving : ORDERS_COPY.actions.ship}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={(event) => {
          void submit(event)
        }}
        className="flex flex-col gap-4"
      >
        <Field label={ORDERS_COPY.actions.carrier} error={errors.carrier?.message} required>
          {(control) => (
            <TextInput
              {...control}
              placeholder={ORDERS_COPY.actions.carrierPlaceholder}
              autoComplete="off"
              {...register('carrier')}
            />
          )}
        </Field>
        <Field
          label={ORDERS_COPY.actions.trackingNumber}
          error={errors.trackingNumber?.message}
          required
        >
          {(control) => (
            <TextInput {...control} autoComplete="off" {...register('trackingNumber')} />
          )}
        </Field>
        <Field label={ORDERS_COPY.actions.note} error={errors.note?.message}>
          {(control) => (
            <Textarea {...control} maxLength={ORDER_NOTE_MAX_LENGTH} {...register('note')} />
          )}
        </Field>
      </form>
    </Dialog>
  )
}
