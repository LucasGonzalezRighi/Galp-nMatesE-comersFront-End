'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import type { ApiMode } from '@/lib/env'
import { OrderResult } from './OrderResult'

/** Props de {@link CheckoutResult}. */
export interface CheckoutResultProps {
  /** Modo de la API, leído en el servidor. */
  apiMode: ApiMode
}

/**
 * `/checkout/resultado?pedido=GLP-…`: adonde vuelve el cliente desde Mercado Pago o después del
 * pago con tarjeta. Lee el número de la dirección (nunca el token) y muestra {@link OrderResult}.
 * Usa `useSearchParams`: la página lo pone dentro de `Suspense`.
 *
 * @param props - Ver {@link CheckoutResultProps}.
 */
export function CheckoutResult({ apiMode }: CheckoutResultProps): ReactNode {
  const number = useSearchParams().get('pedido')
  return <OrderResult number={number} apiMode={apiMode} />
}
