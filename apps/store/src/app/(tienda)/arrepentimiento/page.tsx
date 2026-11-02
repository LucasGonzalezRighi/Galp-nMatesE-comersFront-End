import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { WithdrawalPage } from '@/features/withdrawal'
import { getStoreEnv } from '@/lib/env'
import { buildPageMetadata } from '@/lib/seo'

/** Título y descripción de la página (el título lleva la plantilla "· Galpón Mates"). */
export const metadata: Metadata = buildPageMetadata({
  title: 'Botón de arrepentimiento',
  description: 'Pedí el arrepentimiento de tu compra sin cuenta ni trámites adicionales.',
  path: '/arrepentimiento',
  siteUrl: getStoreEnv().siteUrl,
})

/** Ruta `/arrepentimiento` (Disposición 954/2025): el formulario que no exige número de pedido. */
export default function WithdrawalRoute(): ReactNode {
  return <WithdrawalPage />
}
