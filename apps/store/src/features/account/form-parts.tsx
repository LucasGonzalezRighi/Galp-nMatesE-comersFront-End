'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { DrawCheck } from '@/components/motion'

/** Tarjeta de los formularios de la cuenta (la misma de Contacto y Arrepentimiento). */
export const FORM_CARD =
  'bg-surface flex flex-col gap-4 rounded-lg p-[clamp(20px,3vw,32px)] shadow-sm'

/** Props de {@link FormError}. */
interface FormErrorProps {
  /** Mensaje general del formulario, o `undefined` si no hay. */
  message: string | undefined
}

/** Mensaje general de un formulario (red, credenciales, servidor), anunciado como alerta. */
export function FormError({ message }: FormErrorProps): ReactNode {
  if (message === undefined || message === '') return null
  return (
    <p role="alert" className="text-danger m-0 text-[13px]">
      {message}
    </p>
  )
}

/** Props de {@link Confirmation}. */
interface ConfirmationProps {
  /** Título de la confirmación; recibe el foco al aparecer. */
  title: string
  /** Texto que explica qué pasa ahora. */
  text: string
  /** Acción siguiente (un enlace o un botón). */
  children?: ReactNode
}

/**
 * Confirmación que reemplaza a un formulario enviado, con el check dibujado. El formulario
 * desaparece, así que el foco pasa al título.
 */
export function Confirmation({ title, text, children }: ConfirmationProps): ReactNode {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [])
  return (
    <div className="bg-surface flex flex-col items-start gap-[18px] rounded-lg p-[clamp(24px,3vw,36px)] shadow-[0_0_0_1px_var(--color-accent-700)]">
      <DrawCheck size={56} />
      <h2 ref={heading} tabIndex={-1} className="text-[26px] tracking-[-0.02em] outline-none">
        {title}
      </h2>
      <p className="m-0 text-[15px] leading-[1.65] text-neutral-300">{text}</p>
      {children}
    </div>
  )
}
