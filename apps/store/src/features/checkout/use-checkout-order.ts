'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import type { CartItemInput, ChangeNotice, Order } from '@galpon/api-client'
import type { PaymentMethod } from '@galpon/domain'
import { useCartSync } from '@/features/cart'
import { createOrder, isApiError } from '@galpon/api-client'
import { orderQuery, queryKeys, useApiClient } from '@galpon/api-client/react'
import { buildOrderInput, orderFingerprint } from './checkout-order'
import { CHECKOUT_COPY } from './checkout.copy'
import { useCheckoutStore } from './checkout.store'
import { newIdempotencyKey } from './idempotency-key'
import { clearOrderSession, readOrderSession, saveOrderSession } from './order-session'

/** Fase de la creación del pedido que no depende de la API: la de "listo" sale de la consulta. */
type Phase =
  | { status: 'idle' }
  | { status: 'creating' }
  | { status: 'conflict'; changes: readonly ChangeNotice[] }
  | { status: 'error'; message: string }

/** Estado del pedido del checkout. */
export type CheckoutOrderStatus = 'idle' | 'creating' | 'ready' | 'conflict' | 'error'

/** Lo que necesita {@link useCheckoutOrder}. */
export interface CheckoutOrderInput {
  /** Resumen del carrito (`cartHash`). */
  cartHash: string
  /** Líneas del carrito con su precio esperado (`useCartQuoteInput().items`). */
  items: readonly CartItemInput[]
  /** Total que ve el cliente (subtotal de la cotización más el envío), o `null` mientras se cotiza. */
  expectedTotalArs: number | null
}

/** Lo que devuelve {@link useCheckoutOrder}. */
export interface CheckoutOrder {
  /** En qué está el pedido. */
  status: CheckoutOrderStatus
  /** El pedido confirmado por el back (con `status` `ready`), o `null`. */
  order: Order | null
  /** Qué cambió (con `status` `conflict`). */
  changes: readonly ChangeNotice[]
  /** Mensaje del error (con `status` `error`), o `null`. */
  error: string | null
  /**
   * Crea el pedido para el medio elegido, o devuelve el que ya existe para estos datos. Un doble
   * clic devuelve la misma promesa; un reintento después de un error de red o del servidor (5xx)
   * reutiliza la `Idempotency-Key`.
   *
   * @returns El pedido, o `null` si no se pudo (el motivo queda en `status`).
   */
  confirm: (paymentMethod: PaymentMethod) => Promise<Order | null>
  /** Olvida el pedido (venció o ya no se puede pagar) y muestra el mensaje. */
  discard: (message: string) => void
}

/**
 * Pedido del checkout (spec 14.2 con el Ruling P3-5): se crea con `POST /orders` cuando el cliente
 * elige el medio de pago, con el total que vio y una `Idempotency-Key` guardada en el store del
 * checkout. Al `201` guarda `{ number, orderToken, cartHash }` (`saveOrderSession`); un `409`
 * muestra qué cambió, vuelve a conciliar y cotizar el carrito y pide confirmar de nuevo, sin cobrar.
 *
 * El pedido se reutiliza (también después de recargar, con `GET /orders/{number}`) mientras no
 * cambien el carrito ni los pasos 1 y 2 y siga esperando el pago; si no, el próximo `confirm` crea
 * uno nuevo con otra clave.
 *
 * @param input - Ver {@link CheckoutOrderInput}.
 */
export function useCheckoutOrder({
  cartHash,
  items,
  expectedTotalArs,
}: CheckoutOrderInput): CheckoutOrder {
  const api = useApiClient()
  const queryClient = useQueryClient()
  const syncCart = useCartSync()
  const contact = useCheckoutStore((state) => state.contact)
  const shipping = useCheckoutStore((state) => state.shipping)
  const saved = useCheckoutStore((state) => state.order)
  const [phase, setPhase] = useState<Phase>({ status: 'idle' })
  const inFlight = useRef<Promise<Order | null> | null>(null)

  const fingerprint = orderFingerprint(cartHash, contact, shipping)
  const session = readOrderSession()
  const number =
    fingerprint !== null &&
    saved !== null &&
    saved.fingerprint === fingerprint &&
    session !== null &&
    session.number === saved.number &&
    session.cartHash === cartHash
      ? saved.number
      : null
  const current = useQuery({
    ...orderQuery(api, number ?? ''),
    enabled: number !== null,
    staleTime: 60_000,
  })
  const order =
    number !== null && current.data?.number === number && current.data.status === 'pending_payment'
      ? current.data
      : null

  const create = async (paymentMethod: PaymentMethod): Promise<Order | null> => {
    const state = useCheckoutStore.getState()
    if (fingerprint === null || state.contact === null || state.shipping === null) return null
    if (expectedTotalArs === null) return null
    const body = buildOrderInput({
      contact: state.contact,
      shipping: state.shipping,
      items,
      paymentMethod,
      expectedTotalArs,
    })
    const text = JSON.stringify(body)
    const key = state.attempt?.body === text ? state.attempt.key : newIdempotencyKey()
    state.setAttempt({ key, body: text })
    setPhase({ status: 'creating' })
    try {
      const created = await createOrder(api, body, key)
      saveOrderSession({ number: created.order.number, orderToken: created.orderToken, cartHash })
      queryClient.setQueryData(queryKeys.order(created.order.number), created.order)
      useCheckoutStore.getState().setOrder({ number: created.order.number, fingerprint })
      useCheckoutStore.getState().setAttempt(null)
      setPhase({ status: 'idle' })
      return created.order
    } catch (error) {
      // Sin respuesta, o con un 5xx (un 502 o 504 puede llegar después de que el back confirmó),
      // no se sabe si se creó: el reintento usa la misma clave y el back devuelve el mismo pedido.
      if (isApiError(error) && (error.kind === 'network' || error.kind === 'server')) {
        setPhase({
          status: 'error',
          message: error.kind === 'network' ? CHECKOUT_COPY.networkError : CHECKOUT_COPY.orderError,
        })
        return null
      }
      useCheckoutStore.getState().setAttempt(null)
      if (isApiError(error) && error.kind === 'conflict') {
        // "Confirmar de nuevo" aparece recién con el carrito y el resumen al día: antes mandaría
        // los precios viejos y volvería a chocar con el mismo `409`.
        await syncCart()
        await queryClient.invalidateQueries({ queryKey: ['cart', 'quote'] })
        setPhase({ status: 'conflict', changes: error.problem?.changes ?? [] })
        return null
      }
      setPhase({
        status: 'error',
        message:
          isApiError(error) && error.kind === 'validation'
            ? error.message
            : CHECKOUT_COPY.orderError,
      })
      return null
    }
  }

  const confirm = (paymentMethod: PaymentMethod): Promise<Order | null> => {
    if (order !== null) return Promise.resolve(order)
    if (inFlight.current !== null) return inFlight.current
    const promise = create(paymentMethod).finally(() => {
      inFlight.current = null
    })
    inFlight.current = promise
    return promise
  }

  const discard = (message: string): void => {
    clearOrderSession()
    useCheckoutStore.getState().setOrder(null)
    setPhase({ status: 'error', message })
  }

  const resuming = number !== null && current.isPending
  const status: CheckoutOrderStatus =
    phase.status === 'creating' || resuming ? 'creating' : order !== null ? 'ready' : phase.status
  return {
    status,
    order: status === 'ready' ? order : null,
    changes: phase.status === 'conflict' ? phase.changes : [],
    error: phase.status === 'error' && status === 'error' ? phase.message : null,
    confirm,
    discard,
  }
}
