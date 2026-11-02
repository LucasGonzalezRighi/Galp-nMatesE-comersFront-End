import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { OrderNotFound } from '@/features/account'

/** Título de la pestaña (lleva la plantilla "· Galpón Mates"). */
export const metadata: Metadata = { title: 'Pedido no encontrado' }

/** Pedido inexistente o de otra cuenta en `/cuenta/pedidos/[numero]` (spec 9.7). */
export default function OrderNotFoundRoute(): ReactNode {
  return <OrderNotFound />
}
