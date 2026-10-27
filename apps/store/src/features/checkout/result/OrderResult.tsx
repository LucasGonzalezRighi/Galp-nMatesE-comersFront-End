'use client'

import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { ApiMode } from '@/lib/env'
import type { ApiErrorKind, Order } from '@galpon/api-client'
import { DrawCheck } from '@/components/motion'
import { Button, Spinner, Tag } from '@/components/ui'
import { cartHash, clearCart, openCart, useCart } from '@/features/cart'
import { ChallengeDialog } from '@/features/payments'
import { asRoute } from '@/lib/routes'
import { cancelPayment, isApiError } from '@galpon/api-client'
import { orderQuery, useApiClient } from '@galpon/api-client/react'
import { isOrderNumber } from '@galpon/domain'
import { clearOrderSession, readOrderSession } from '../order-session'
import { isChallengeDoneMessage } from './mp-simulator'
import { OrderSummary } from './OrderSummary'
import {
  mercadoPagoSimulatorChallengeUrl,
  PENDING_MAX_POLLS,
  PENDING_POLL_INTERVAL_MS,
  rejectionReason,
  resultKind,
} from './result-view'
import { RESULT_COPY } from './result.copy'

/** Contenedor de la pantalla, con las medidas del diseño. */
const SHELL =
  'mx-auto flex w-full max-w-[760px] flex-col items-start gap-[22px] px-[clamp(20px,5vw,64px)] py-[clamp(64px,9vw,120px)]'

/** Título principal. */
const TITLE = 'm-0 text-[clamp(38px,5vw,64px)] leading-none tracking-[-0.035em]'

/** Texto de apoyo. */
const LEAD = 'm-0 text-[16px] leading-[1.65] text-neutral-300'

/** Errores de la API que se muestran como "No encontramos ese pedido" (sin revelar por qué). */
const NOT_FOUND_KINDS: ReadonlySet<ApiErrorKind> = new Set([
  'not_found',
  'validation',
  'unauthorized',
  'forbidden',
])

/** Props de {@link OrderResult}. */
export interface OrderResultProps {
  /** Número de pedido de la dirección (`?pedido=` o `/pedido/{numero}`), o `null` si falta. */
  number: string | null
  /** Modo de la API: en modo de prueba el desafío 3-D Secure se retoma en el simulador. */
  apiMode: ApiMode
  /**
   * `result` (por omisión) es `/checkout/resultado`: agradece y vacía el carrito si el pago se
   * aprobó. `tracking` es el seguimiento `/pedido/{numero}`: muestra el estado del pedido.
   */
  variant?: 'result' | 'tracking'
}

/** El pedido guardado en `sessionStorage` no avisa cambios: se lee en cada render. */
function subscribeToNothing(): () => void {
  return () => undefined
}

/** Número del pedido en curso de la pestaña, o `null` si no hay. */
function readTabOrderNumber(): string | null {
  return readOrderSession()?.number ?? null
}

/** En el servidor todavía no se sabe: `undefined`. */
function readServerOrderNumber(): undefined {
  return undefined
}

/**
 * Pantalla mientras se lee el pedido: "Consultando tu pedido…" (spec 9.6).
 */
export function OrderResultLoading(): ReactNode {
  return (
    <div className={SHELL} aria-busy="true">
      <p className="m-0 flex items-center gap-3 text-[15px] text-neutral-300">
        <Spinner />
        {RESULT_COPY.loading}
      </p>
    </div>
  )
}

/** "No encontramos ese pedido", sin decir si existe. */
function OrderNotFound(): ReactNode {
  return (
    <div className={SHELL}>
      <h1 className={TITLE}>{RESULT_COPY.notFound.title}</h1>
      <p className={LEAD}>{RESULT_COPY.notFound.text}</p>
      <Button asChild variant="secondary">
        <Link href={asRoute('/tienda')}>{RESULT_COPY.notFound.shop}</Link>
      </Button>
    </div>
  )
}

/** Props de {@link ActionError}. */
interface ActionErrorProps {
  /** Error para mostrar, o `null` si no hay. */
  message: string | null
}

/** Mensaje de error de una acción. */
function ActionError({ message }: ActionErrorProps): ReactNode {
  if (message === null) return null
  return (
    <p role="alert" className="text-danger m-0 text-[14px]">
      {message}
    </p>
  )
}

/** Acción para volver a pagar el mismo pedido o, si ya no sirve, uno nuevo. */
interface RetryPayment {
  /** Prepara el nuevo intento; con `cancelFirst` cancela antes el intento anterior. */
  retry: (cancelFirst: boolean) => void
  /** Si está preparando el intento. */
  busy: boolean
  /** Error para mostrar, o `null`. */
  error: string | null
}

/**
 * Vuelve al paso de pago con el mismo pedido (`/checkout?pedido=…`) si sigue reservado y el
 * carrito no cambió; si no, olvida el pedido y vuelve al checkout para crear uno nuevo (spec 14.2).
 *
 * @param order - Pedido actual.
 * @param onConflict - Se llama si la API dice que el pedido ya se pagó o venció.
 */
function useRetryPayment(order: Order, onConflict: () => void): RetryPayment {
  const api = useApiClient()
  const router = useRouter()
  const { lines, hasHydrated } = useCart()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function retry(cancelFirst: boolean): Promise<void> {
    const session = readOrderSession()
    const expired = Date.parse(order.reservedUntil) <= Date.now()
    const cartChanged = hasHydrated && session?.cartHash !== cartHash(lines)
    if (session?.number !== order.number || expired || cartChanged) {
      clearOrderSession()
      router.push(asRoute('/checkout'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (cancelFirst) await cancelPayment(api, order.number)
      router.push(asRoute(`/checkout?pedido=${encodeURIComponent(order.number)}`))
    } catch (cause) {
      setBusy(false)
      if (isApiError(cause) && cause.kind === 'conflict') onConflict()
      else setError(RESULT_COPY.retryError)
    }
  }

  return {
    retry: (cancelFirst) => {
      void retry(cancelFirst)
    },
    busy,
    error,
  }
}

/** Props de los paneles de cada estado. */
interface PanelProps {
  /** El pedido. */
  order: Order
  /** Vuelve a consultar el pedido. */
  refresh: () => void
}

/** Pago aprobado: check dibujado, "¡Gracias, {nombre}!" y el aviso del mail. */
function ApprovedPanel({ order }: Pick<PanelProps, 'order'>): ReactNode {
  return (
    <>
      <DrawCheck size={72} />
      <h1 className={TITLE}>{RESULT_COPY.approved.title(order.customer.firstName)}</h1>
      <p className={LEAD}>{RESULT_COPY.approved.text(order.number, order.customer.email)}</p>
      <p className="m-0 text-[14px] text-neutral-400">
        {RESULT_COPY.approved.help}{' '}
        <Link
          href={asRoute('/contacto')}
          className="text-accent underline-offset-4 hover:underline"
        >
          {RESULT_COPY.approved.contact}
        </Link>
        .
      </p>
    </>
  )
}

/** Encabezado del seguimiento: número y estado del pedido. */
function TrackingHeader({ order }: Pick<PanelProps, 'order'>): ReactNode {
  return (
    <>
      <h1 className={`${TITLE} tabular-nums`}>{RESULT_COPY.tracking.title(order.number)}</h1>
      <Tag variant="outline">{RESULT_COPY.orderStatus[order.status]}</Tag>
    </>
  )
}

/** Props de {@link PendingPanel}. */
interface PendingPanelProps extends Pick<PanelProps, 'order'> {
  /** Si ya pasaron los 2 minutos de espera. */
  timedOut: boolean
}

/** Pago pendiente: espera con consultas cada 5 s; a los 2 min, el aviso por mail. */
function PendingPanel({ order, timedOut }: PendingPanelProps): ReactNode {
  if (timedOut) {
    return (
      <>
        <h1 className={TITLE}>{RESULT_COPY.pending.timeoutTitle}</h1>
        <p className={LEAD}>
          {RESULT_COPY.pending.timeoutText(order.number, order.customer.email)}
        </p>
      </>
    )
  }
  return (
    <>
      <Spinner size={32} />
      <h1 className={TITLE}>{RESULT_COPY.pending.title}</h1>
      <p className={LEAD} aria-live="polite">
        {RESULT_COPY.pending.text}
      </p>
    </>
  )
}

/** Props de {@link ActionRequiredPanel}. */
interface ActionRequiredPanelProps extends PanelProps {
  /** Dirección del desafío que guardó el checkout, o `null` si no se puede retomar. */
  challengeUrl: string | null
}

/**
 * Falta la verificación 3-D Secure: abre el desafío en el diálogo y, al cerrarlo o cuando el
 * desafío avisa que terminó (`postMessage` del mismo origen), consulta el pedido. Si lo cierra sin
 * terminar, "Verificar con mi banco" lo vuelve a abrir. La dirección del desafío la guardó el checkout
 * (el pedido no la trae); sin ella, por ejemplo si la pestaña no hizo el pago, ofrece pagar de
 * nuevo.
 */
function ActionRequiredPanel({
  order,
  refresh,
  challengeUrl,
}: ActionRequiredPanelProps): ReactNode {
  const [open, setOpen] = useState(true)
  const payment = useRetryPayment(order, refresh)

  useEffect(() => {
    function onMessage(event: MessageEvent): void {
      if (!isChallengeDoneMessage(event, window.location.origin)) return
      setOpen(false)
      refresh()
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [refresh])

  return (
    <>
      <h1 className={TITLE}>{RESULT_COPY.actionRequired.title}</h1>
      <p className={LEAD}>{RESULT_COPY.actionRequired.text}</p>
      {challengeUrl === null ? (
        <Button
          size="lg"
          loading={payment.busy}
          onClick={() => {
            payment.retry(true)
          }}
        >
          {RESULT_COPY.actionRequired.payAgain}
        </Button>
      ) : (
        <Button
          size="lg"
          onClick={() => {
            setOpen(true)
          }}
        >
          {RESULT_COPY.actionRequired.verify}
        </Button>
      )}
      <ActionError message={payment.error} />
      <ChallengeDialog
        url={open ? challengeUrl : null}
        onClose={() => {
          setOpen(false)
          refresh()
        }}
      />
    </>
  )
}

/** Pago rechazado: motivo en español y "Probar con otro medio". */
function RejectedPanel({ order, refresh }: PanelProps): ReactNode {
  const payment = useRetryPayment(order, refresh)
  return (
    <>
      <h1 className={TITLE}>{RESULT_COPY.rejected.title}</h1>
      <p className={LEAD}>{rejectionReason(order.payment.statusDetail)}</p>
      <Button
        size="lg"
        loading={payment.busy}
        onClick={() => {
          payment.retry(true)
        }}
      >
        {RESULT_COPY.rejected.retry}
      </Button>
      <ActionError message={payment.error} />
    </>
  )
}

/** Sin pago (o cancelado) con el pedido todavía reservado: "No completaste el pago" + "Pagar". */
function UnpaidPanel({ order, refresh }: PanelProps): ReactNode {
  const payment = useRetryPayment(order, refresh)
  return (
    <>
      <h1 className={TITLE}>{RESULT_COPY.unpaid.title}</h1>
      <p className={LEAD}>{RESULT_COPY.unpaid.text}</p>
      <Button
        size="lg"
        loading={payment.busy}
        onClick={() => {
          payment.retry(false)
        }}
      >
        {RESULT_COPY.unpaid.pay}
      </Button>
      <ActionError message={payment.error} />
    </>
  )
}

/** Pedido vencido: "El pedido venció" + "Volver al carrito". */
function ExpiredPanel(): ReactNode {
  return (
    <>
      <h1 className={TITLE}>{RESULT_COPY.expired.title}</h1>
      <p className={LEAD}>{RESULT_COPY.expired.text}</p>
      <Button size="lg" onClick={openCart}>
        {RESULT_COPY.expired.backToCart}
      </Button>
    </>
  )
}

/** Props de {@link KnownOrder}. */
interface KnownOrderProps {
  /** Número del pedido en curso de la pestaña. */
  number: string
  /** Ver {@link OrderResultProps.apiMode}. */
  apiMode: ApiMode
  /** Ver {@link OrderResultProps.variant}. */
  variant: 'result' | 'tracking'
}

/**
 * Lee el pedido de la pestaña y muestra la pantalla de su estado, con el detalle debajo. Siempre
 * consulta el pedido al abrir la pantalla: el checkout sembró la cache con el pedido recién creado
 * (sin pagar) y la cache de la tienda lo da por fresco un minuto, así que sin esto un pago aprobado
 * se vería como "No completaste el pago". Hasta que llega esa consulta no se muestra el pedido
 * sembrado.
 */
function KnownOrder({ number, apiMode, variant }: KnownOrderProps): ReactNode {
  const api = useApiClient()
  const [timedOut, setTimedOut] = useState(false)
  const query = useQuery({
    ...orderQuery(api, number),
    refetchOnMount: 'always',
    refetchInterval: timedOut
      ? false
      : (current) =>
          current.state.data !== undefined && resultKind(current.state.data) === 'pending'
            ? PENDING_POLL_INTERVAL_MS
            : false,
  })
  const { refetch } = query
  // El pedido sembrado al crearlo (pending_payment/none) no se muestra hasta que la consulta de
  // montaje trae el estado real; si esa consulta falla, `isFetchedAfterMount` también es true,
  // así que se exige además que no haya error (y la rama `isError` ofrece reintentar).
  const order = query.isFetchedAfterMount && !query.isError ? query.data : undefined
  const kind = order === undefined ? null : resultKind(order)
  const isPending = kind === 'pending'
  const clearsCart = kind === 'approved' && variant === 'result'

  useEffect(() => {
    if (!isPending) return undefined
    const timer = window.setTimeout(() => {
      setTimedOut(true)
    }, PENDING_POLL_INTERVAL_MS * PENDING_MAX_POLLS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [isPending])

  useEffect(() => {
    if (clearsCart) clearCart()
  }, [clearsCart])

  const refresh = useCallback((): void => {
    void refetch()
  }, [refetch])

  if (order === undefined || kind === null) {
    if (!query.isError) return <OrderResultLoading />
    if (isApiError(query.error) && NOT_FOUND_KINDS.has(query.error.kind)) return <OrderNotFound />
    return (
      <div className={SHELL}>
        <p role="alert" className={LEAD}>
          {RESULT_COPY.loadError}
        </p>
        <Button variant="secondary" loading={query.isFetching} onClick={refresh}>
          {RESULT_COPY.retry}
        </Button>
      </div>
    )
  }

  return (
    <div className={SHELL}>
      {kind === 'approved' && variant === 'result' ? <ApprovedPanel order={order} /> : null}
      {(kind === 'approved' && variant === 'tracking') || kind === 'other' ? (
        <TrackingHeader order={order} />
      ) : null}
      {kind === 'pending' ? <PendingPanel order={order} timedOut={timedOut} /> : null}
      {kind === 'action_required' ? (
        <ActionRequiredPanel
          order={order}
          refresh={refresh}
          challengeUrl={
            readOrderSession()?.challengeUrl ??
            (apiMode === 'mock' ? mercadoPagoSimulatorChallengeUrl(number) : null)
          }
        />
      ) : null}
      {kind === 'rejected' ? <RejectedPanel order={order} refresh={refresh} /> : null}
      {kind === 'unpaid' ? <UnpaidPanel order={order} refresh={refresh} /> : null}
      {kind === 'expired' ? <ExpiredPanel /> : null}
      <OrderSummary order={order} />
      {kind === 'approved' && variant === 'result' ? (
        <Button asChild size="lg">
          <Link href={asRoute('/tienda')}>{RESULT_COPY.approved.keepShopping}</Link>
        </Button>
      ) : null}
    </div>
  )
}

/**
 * Resultado del pago (`/checkout/resultado`) y seguimiento del pedido de invitado
 * (`/pedido/{numero}`), spec 14.2. Lee el pedido con el token de la pestaña (`sessionStorage`,
 * cabecera `X-Order-Token`) y muestra la pantalla de su estado:
 *
 * - `approved`: "¡Gracias, {nombre}!" con el check dibujado y el detalle; vacía el carrito.
 * - `pending`: consulta cada 5 s; a los 2 min deja de consultar y avisa que llega un mail.
 * - `action_required`: retoma el desafío 3-D Secure.
 * - `rejected`: el motivo en español y "Probar con otro medio".
 * - `none` o `cancelled` con el pedido reservado: "No completaste el pago" + "Pagar".
 * - pedido vencido: "El pedido venció" + "Volver al carrito".
 *
 * Sin token, con otro número o con un token que la API no reconoce muestra "No encontramos ese
 * pedido" sin revelar si existe (RF 2).
 *
 * @param props - Ver {@link OrderResultProps}.
 */
export function OrderResult({ number, apiMode, variant = 'result' }: OrderResultProps): ReactNode {
  const tabOrderNumber = useSyncExternalStore(
    subscribeToNothing,
    readTabOrderNumber,
    readServerOrderNumber,
  )
  if (tabOrderNumber === undefined) return <OrderResultLoading />
  if (number === null || !isOrderNumber(number) || tabOrderNumber !== number) {
    return <OrderNotFound />
  }
  return <KnownOrder number={number} apiMode={apiMode} variant={variant} />
}
