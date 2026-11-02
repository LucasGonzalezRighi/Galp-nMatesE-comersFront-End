'use client'

import type { ReactNode } from 'react'
import { CheckIcon } from '@phosphor-icons/react/Check'
import { CopyIcon } from '@phosphor-icons/react/Copy'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui'
import { CONTACT_COPY } from './contact.copy'

/** Cuánto tiempo (ms) dice "Copiado" antes de volver a "Copiar". */
export const COPIED_DURATION_MS = 1800

/** Props de {@link CopyEmailButton}. */
export interface CopyEmailButtonProps {
  /** El email que se copia al portapapeles. */
  email: string
}

/**
 * Botón "Copiar" del email: lo copia al portapapeles y durante 1,8 s dice "Copiado" con un tilde
 * cobre. Si el navegador no deja copiar, no dice "Copiado". Anuncia la copia a los lectores de
 * pantalla.
 *
 * @param props - Ver {@link CopyEmailButtonProps}.
 */
export function CopyEmailButton({ email }: CopyEmailButtonProps): ReactNode {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(
    () => () => {
      clearTimeout(timer.current)
    },
    [],
  )

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(email)
    } catch {
      // Sin acceso al portapapeles (permiso o contexto no seguro): no se marca como copiado.
      return
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setCopied(false)
    }, COPIED_DURATION_MS)
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          void copy()
        }}
      >
        {copied ? (
          <CheckIcon size={14} weight="bold" className="text-accent" aria-hidden="true" />
        ) : (
          <CopyIcon size={14} aria-hidden="true" />
        )}
        {copied ? CONTACT_COPY.copied : CONTACT_COPY.copy}
      </Button>
      <span role="status" className="sr-only">
        {copied ? CONTACT_COPY.copiedAnnouncement : ''}
      </span>
    </>
  )
}
