import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { WithdrawalPage } from '@/features/withdrawal'

/** Título y descripción de la página (el título lleva la plantilla "· Galpón Mates"). */
export const metadata: Metadata = {
  title: 'Botón de arrepentimiento',
  description: 'Pedí el arrepentimiento de tu compra sin cuenta ni trámites adicionales.',
}

/** Ruta `/arrepentimiento` (Disposición 954/2025): el formulario que no exige número de pedido. */
export default function WithdrawalRoute(): ReactNode {
  return <WithdrawalPage />
}
