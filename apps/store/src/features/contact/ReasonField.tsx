'use client'

import type { ReactNode } from 'react'
import type { ContactReason } from '@galpon/schemas'
import { Segmented } from '@/components/ui'
import { CONTACT_REASONS } from '@galpon/schemas'
import { CONTACT_COPY } from './contact.copy'

/** Props de {@link ReasonField}. */
export interface ReasonFieldProps {
  /** Motivo elegido. */
  value: ContactReason
  /** Se llama con el motivo que elige la persona. */
  onChange: (reason: ContactReason) => void
}

/** Opciones del selector: los motivos del schema, en su orden. */
const OPTIONS = CONTACT_REASONS.map((reason) => ({ value: reason, label: reason }))

/**
 * Selector del motivo de contacto ("Motivo" con Pedido, Envío, Cambio, Arrepentimiento y Otro).
 *
 * `Segmented` no envuelve: el marco y las líneas de separación se dibujan acá para que, cuando
 * los motivos pasan a dos filas (celular), queden separados por filas y por columnas sin
 * duplicar el borde. Cada opción lleva su borde derecho e inferior, y el marco recorta los del
 * último elemento de cada fila y de la última fila.
 *
 * @param props - Ver {@link ReasonFieldProps}.
 */
export function ReasonField({ value, onChange }: ReasonFieldProps): ReactNode {
  return (
    <div className="flex flex-col">
      <span aria-hidden="true" className="text-foreground/70 mb-[5px] block text-[12px]">
        {CONTACT_COPY.reason}
      </span>
      <div className="border-divider inline-flex max-w-full self-start overflow-hidden rounded-md border">
        <Segmented
          label={CONTACT_COPY.reason}
          options={OPTIONS}
          value={value}
          onChange={onChange}
          className="[&>label]:border-divider -mr-px -mb-px flex-wrap rounded-none! border-0! [&>label]:flex-auto [&>label]:border-r [&>label]:border-b [&>label]:border-l-0"
        />
      </div>
    </div>
  )
}
