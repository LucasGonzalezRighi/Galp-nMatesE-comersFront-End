'use client'

import type { ReactNode } from 'react'
import { PrinterIcon } from '@phosphor-icons/react/dist/ssr/Printer'
import { Button } from '@/components/ui'
import { LEGAL_COPY } from './legal.copy'

/**
 * Botón que abre la impresión del navegador para imprimir el documento o guardarlo como PDF
 * (`legal.css` deja solo el documento, en blanco y negro).
 */
export function PrintButton(): ReactNode {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      data-legal-print=""
      className="min-h-[36px] self-start"
      onClick={() => {
        window.print()
      }}
    >
      <PrinterIcon size={16} aria-hidden="true" />
      {LEGAL_COPY.print}
    </Button>
  )
}
