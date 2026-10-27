'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { ContactReason } from '@galpon/schemas'
import { WithdrawalForm } from '@/features/withdrawal'
import { ContactForm } from './ContactForm'
import { ReasonField } from './ReasonField'
import { useRemountKey } from './use-remount-key'

/** Motivo que cambia el formulario por el del botón de arrepentimiento (spec 9.6). */
const WITHDRAWAL_REASON: ContactReason = 'Arrepentimiento'

/** Contenido de {@link ContactPanel}, con el motivo elegido. */
function ContactPanelBody(): ReactNode {
  const [reason, setReason] = useState<ContactReason>('Pedido')
  const contactRef = useRef<HTMLDivElement>(null)
  const withdrawalRef = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)
  const withdrawal = reason === WITHDRAWAL_REASON

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    // El selector que tenía el foco queda oculto: se lo devuelve al del formulario visible.
    const visible = withdrawal ? withdrawalRef.current : contactRef.current
    visible?.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.focus()
  }, [withdrawal])

  const reasonField = <ReasonField value={reason} onChange={setReason} />

  return (
    <>
      <div ref={contactRef} hidden={withdrawal}>
        <ContactForm reason={reason} reasonField={reasonField} />
      </div>
      <div ref={withdrawalRef} hidden={!withdrawal}>
        <WithdrawalForm leading={reasonField} />
      </div>
    </>
  )
}

/**
 * Tarjeta de la derecha de Contacto: el formulario de contacto y, si el motivo es
 * "Arrepentimiento", el formulario del botón de arrepentimiento (`withdrawal`). Los dos quedan
 * montados (el que no se usa va oculto) para no perder lo que la persona ya escribió al cambiar
 * de motivo, y el foco pasa al selector del formulario que queda a la vista. Cuando la página se
 * oculta (`<Activity>` de Cache Components) se vuelve a montar entera: al volver, el motivo es
 * "Pedido" y los formularios están vacíos.
 */
export function ContactPanel(): ReactNode {
  const resetKey = useRemountKey()
  return <ContactPanelBody key={resetKey} />
}
