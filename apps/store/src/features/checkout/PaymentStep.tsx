'use client'

import type { ReactNode } from 'react'
import { LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { CardPaymentFormHandle, CardPaymentSubmission } from '@/features/payments'
import type { ApiMode } from '@/lib/env'
import type { InstallmentsInput, Order } from '@galpon/api-client'
import type { PaymentMethod } from '@galpon/domain'
import { Button } from '@/components/ui'
import { CardPaymentForm, ChallengeDialog } from '@/features/payments'
import { asRoute } from '@/lib/routes'
import { createMercadoPagoPreference, isApiError, payWithCard } from '@galpon/api-client'
import { installmentsQuery, useApiClient } from '@galpon/api-client/react'
import { formatDateTime, formatPesos, ORDER_RESERVATION_MINUTES, pesos } from '@galpon/domain'
import type { CheckoutOrder } from './use-checkout-order'
import { CHECKOUT_COPY, payLabel, payWithMpLabel, reservationNote } from './checkout.copy'
import { newIdempotencyKey } from './idempotency-key'
import { OptionCard } from './OptionCard'
import { saveChallengeUrl } from './order-session'
import { isChallengeDoneMessage } from './result/mp-simulator'
import { StepActions } from './StepActions'

/** Cuotas sin tarjeta: solo para armar la consulta deshabilitada. */
const NO_BIN: InstallmentsInput = { bin: '', paymentTypeId: 'credit_card' }

/** Un medio de pago del paso 3 con sus textos. */
interface MethodOption {
  /** Medio de pago. */
  value: PaymentMethod
  /** Nombre. */
  label: string
  /** Detalle. */
  hint: string
}

/** Desafío 3-D Secure abierto y el pedido al que pertenece. */
interface OpenChallenge {
  /** Dirección del desafío. */
  url: string
  /** Número del pedido. */
  number: string
}

/** Medios de pago del paso 3 con sus textos. */
const METHODS: readonly MethodOption[] = [
  { value: 'mp_redirect', label: CHECKOUT_COPY.mpLabel, hint: CHECKOUT_COPY.mpHint },
  { value: 'card', label: CHECKOUT_COPY.cardLabel, hint: CHECKOUT_COPY.cardHint },
]

/** Intento de cobro con tarjeta: los datos que se mandaron y la `Idempotency-Key` con la que se mandaron. */
interface CardAttempt {
  /** UUID v4 del cobro; se reutiliza solo para reenviar estos mismos datos. */
  key: string
  /** Datos del pago, con el token de un solo uso que ya se pidió. */
  submission: CardPaymentSubmission
}

/** Botón principal del pago (las medidas del diseño). */
const PAY_BUTTON = 'min-h-[50px] text-[15px] shadow-[0_0_32px_-10px_var(--color-accent)]'

/** Props de {@link PaymentStep}. */
export interface PaymentStepProps {
  /** Modo de la API (desde el servidor). */
  apiMode: ApiMode
  /** Clave pública de Mercado Pago (desde el servidor), o `null`. */
  mpPublicKey: string | null
  /** Pedido del checkout (`useCheckoutOrder`). */
  checkout: CheckoutOrder
  /** Si se puede confirmar el pedido: la cotización está al día y todas las líneas se pueden comprar. */
  canConfirm: boolean
  /** Si hay líneas sin stock que bloquean el pago. */
  blocked: boolean
  /** Abre el carrito para quitar las líneas sin stock. */
  onViewCart: () => void
  /** Vuelve al paso 2. */
  onBack: () => void
}

/** Dirección de `/checkout/resultado` de un pedido (solo con el número, nunca el token). */
function resultRoute(number: string) {
  return asRoute(`/checkout/resultado?pedido=${encodeURIComponent(number)}`)
}

/**
 * Recuerda el desafío 3-D Secure del pago para retomarlo en el resultado (spec 14.2). El pago ya
 * está hecho: si la dirección no sirve o `sessionStorage` no deja escribir (cuota llena, modo
 * privado) no se guarda y el resultado ofrece pagar de nuevo, pero nunca se muestra un error de
 * pago.
 */
function rememberChallenge(number: string, url: string | null): void {
  try {
    saveChallengeUrl(number, url)
  } catch {
    // El pago ya se hizo: un desafío que no se pudo recordar no es un error de pago.
  }
}

/**
 * Avisos legales antes del botón "Pagar" (spec 14.1 y 14.6): el arrepentimiento con su botón, y la
 * aceptación de los Términos y la Política de privacidad.
 */
function LegalNotice(): ReactNode {
  return (
    <div className="flex flex-col gap-2 rounded-[10px] px-4 py-[14px] text-[13.5px] leading-[1.6] shadow-[0_0_0_1px_var(--color-accent-700)]">
      <p className="text-foreground m-0">
        {CHECKOUT_COPY.withdrawal}{' '}
        <Link href={asRoute('/arrepentimiento')} className="text-accent underline">
          {CHECKOUT_COPY.withdrawalLink}
        </Link>
      </p>
      <p className="m-0 text-neutral-300">
        {CHECKOUT_COPY.termsBefore}{' '}
        <Link href={asRoute('/terminos')} className="text-accent underline">
          {CHECKOUT_COPY.termsLink}
        </Link>{' '}
        {CHECKOUT_COPY.termsAnd}{' '}
        <Link href={asRoute('/privacidad')} className="text-accent underline">
          {CHECKOUT_COPY.termsPrivacyLink}
        </Link>
        .
      </p>
    </div>
  )
}

/**
 * Paso 3, Pago (spec 14.1 y 14.2 con el Ruling P3-5): al elegir Mercado Pago o tarjeta se confirma
 * el pedido (`POST /orders`) y se muestra la reserva de 30 minutos. "Pagar $X con Mercado Pago"
 * crea la preferencia y lleva a `initPoint`; "Pagar $X" pide el token de la tarjeta, cobra con
 * `payWithCard` y, si hace falta, abre el desafío 3-D Secure. Las dos terminan en
 * `/checkout/resultado?pedido=…`. X es siempre el total que confirmó el back.
 *
 * @param props - Ver {@link PaymentStepProps}.
 */
export function PaymentStep({
  apiMode,
  mpPublicKey,
  checkout,
  canConfirm,
  blocked,
  onViewCart,
  onBack,
}: PaymentStepProps): ReactNode {
  const api = useApiClient()
  const router = useRouter()
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [bin, setBin] = useState<InstallmentsInput | null>(null)
  const [paying, setPaying] = useState<PaymentMethod | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [challenge, setChallenge] = useState<OpenChallenge | null>(null)
  const busy = useRef(false)
  const payKey = useRef<string | null>(null)
  const cardAttempt = useRef<CardAttempt | null>(null)
  const cardEdited = useRef(false)
  const cardForm = useRef<CardPaymentFormHandle>(null)
  const { order } = checkout
  const installments = useQuery({
    ...installmentsQuery(api, order?.number ?? '', bin ?? NO_BIN),
    enabled: order !== null && bin !== null,
  })

  // Las claves y los datos de un intento valen para su pedido: con otro pedido empieza de cero.
  const orderNumber = order?.number ?? null
  useEffect(() => {
    payKey.current = null
    cardAttempt.current = null
  }, [orderNumber])

  // El desafío avisa que terminó (`postMessage` del mismo origen): se va al resultado sin esperar
  // a que toquen "Ya terminé", igual que en `/checkout/resultado`.
  useEffect(() => {
    if (challenge === null) return
    const { number } = challenge
    function onMessage(event: MessageEvent): void {
      if (isChallengeDoneMessage(event, window.location.origin)) router.push(resultRoute(number))
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [challenge, router])

  // Si la persona vuelve con Atrás desde Mercado Pago, el navegador restaura la página tal como
  // estaba (bfcache): el botón seguiría en "Conectando…". La clave de la preferencia se conserva,
  // así que volver a tocar "Pagar" devuelve la misma.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent): void {
      if (!event.persisted) return
      busy.current = false
      setPaying(null)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => {
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  const choose = (next: PaymentMethod): void => {
    setMethod(next)
    setPayError(null)
    payKey.current = null
    cardAttempt.current = null
    void checkout.confirm(next)
  }

  const stopPaying = (): void => {
    busy.current = false
    setPaying(null)
  }

  const fail = (error: unknown): void => {
    stopPaying()
    if (isApiError(error) && (error.kind === 'network' || error.kind === 'server')) {
      // Sin respuesta, o con un 5xx que puede haber llegado después de que el back cobró, no se
      // sabe si el pago se hizo: el reintento usa la misma clave (y, con tarjeta, los mismos
      // datos) y el back devuelve el mismo intento.
      setPayError(error.kind === 'network' ? CHECKOUT_COPY.networkError : CHECKOUT_COPY.payError)
      return
    }
    payKey.current = null
    cardAttempt.current = null
    if (isApiError(error) && error.kind === 'conflict') {
      setMethod(null)
      checkout.discard(CHECKOUT_COPY.orderExpired)
      return
    }
    setPayError(CHECKOUT_COPY.payError)
  }

  const payWithMercadoPago = async (current: Order): Promise<void> => {
    if (busy.current) return
    busy.current = true
    setPaying('mp_redirect')
    setPayError(null)
    payKey.current ??= newIdempotencyKey()
    try {
      const preference = await createMercadoPagoPreference(api, current.number, payKey.current)
      // El botón queda ocupado mientras el navegador va a Mercado Pago.
      window.location.assign(preference.initPoint)
    } catch (error) {
      fail(error)
    }
  }

  const payWithCardForm = async (
    current: Order,
    provided?: CardPaymentSubmission,
  ): Promise<void> => {
    if (busy.current) return
    busy.current = true
    setPaying('card')
    setPayError(null)
    try {
      // Si la persona cambió la tarjeta, es otro cobro: otros datos y otra clave.
      if (cardEdited.current) cardAttempt.current = null
      cardEdited.current = false
      // Después de un error de red o del servidor se reenvían los mismos datos con la misma clave:
      // un token nuevo cambiaría el cuerpo y el back rechazaría la clave (422).
      let attempt = cardAttempt.current
      if (attempt === null) {
        const submission = provided ?? (await cardForm.current?.createCardToken()) ?? null
        // Sin token, el formulario ya muestra qué falta.
        if (submission === null) {
          stopPaying()
          return
        }
        attempt = { key: newIdempotencyKey(), submission }
        cardAttempt.current = attempt
      }
      const { key, submission } = attempt
      const result = await payWithCard(
        api,
        current.number,
        {
          token: submission.token,
          paymentMethodId: submission.paymentMethodId,
          issuerId: submission.issuerId,
          installments: submission.installments,
          payer: { email: current.customer.email, identification: submission.identification },
        },
        key,
      )
      cardAttempt.current = null
      rememberChallenge(current.number, result.challenge?.url ?? null)
      if (result.challenge === null) router.push(resultRoute(current.number))
      else setChallenge({ url: result.challenge.url, number: current.number })
    } catch (error) {
      fail(error)
    }
  }

  const options = (
    <fieldset className="m-0 flex flex-col gap-[10px] border-0 p-0">
      <legend className="sr-only">{CHECKOUT_COPY.paymentMethod}</legend>
      {METHODS.map((option) => (
        <OptionCard
          key={option.value}
          name="payment-method"
          value={option.value}
          checked={method === option.value}
          label={option.label}
          hint={option.hint}
          disabled={!canConfirm || paying !== null}
          onSelect={() => {
            choose(option.value)
          }}
        />
      ))}
    </fieldset>
  )

  const total = order === null ? '' : formatPesos(pesos(order.totalArs))
  // Como en el diseño, la línea del candado va siempre justo antes de los botones del paso.
  const processedBy = (
    <span className="flex items-center gap-2 text-[12.5px] text-neutral-500">
      <LockSimpleIcon size={14} aria-hidden="true" />
      {CHECKOUT_COPY.processedBy}
    </span>
  )
  const backOnly = (
    <>
      {processedBy}
      <Button variant="secondary" size="lg" className="min-h-[48px] self-start" onClick={onBack}>
        {CHECKOUT_COPY.back}
      </Button>
    </>
  )

  // El pedido dejó de valer (cambió el carrito, el contacto o el envío) con el medio ya elegido: el
  // radio marcado no vuelve a avisar, así que se pide confirmar de nuevo en lugar de dejar sin salida.
  const changed = method !== null && order === null && checkout.status === 'idle'
  let body: ReactNode = backOnly
  if (checkout.status === 'creating') {
    body = (
      <>
        {processedBy}
        <StepActions onBack={onBack}>
          <Button size="lg" fullWidth loading className={PAY_BUTTON}>
            {CHECKOUT_COPY.creatingOrder}
          </Button>
        </StepActions>
      </>
    )
  } else if (checkout.status === 'conflict' || checkout.status === 'error' || changed) {
    const conflict = checkout.status === 'conflict'
    body = (
      <>
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-[10px] px-4 py-[14px] text-[14px] leading-[1.6] shadow-[0_0_0_1px_var(--color-danger)]"
        >
          {conflict ? <p className="m-0 text-[15px]">{CHECKOUT_COPY.conflictTitle}</p> : null}
          {checkout.changes.length > 0 ? (
            <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-neutral-300">
              {checkout.changes.map((change, index) => (
                <li key={`${change.kind}-${String(index)}`}>{change.message}</li>
              ))}
            </ul>
          ) : null}
          <p className="m-0 text-neutral-300">
            {conflict
              ? CHECKOUT_COPY.conflictText
              : changed
                ? CHECKOUT_COPY.orderChanged
                : checkout.error}
          </p>
        </div>
        {processedBy}
        <StepActions onBack={onBack}>
          <Button
            size="lg"
            fullWidth
            className={PAY_BUTTON}
            disabled={!canConfirm || method === null}
            onClick={() => {
              if (method !== null) void checkout.confirm(method)
            }}
          >
            {conflict || changed ? CHECKOUT_COPY.confirmAgain : CHECKOUT_COPY.retry}
          </Button>
        </StepActions>
      </>
    )
  } else if (order !== null && method === 'mp_redirect') {
    body = (
      <>
        <p className="m-0 text-[14px] leading-[1.6] text-neutral-300">{CHECKOUT_COPY.mpNote}</p>
        <LegalNotice />
        {processedBy}
        <StepActions onBack={onBack}>
          <Button
            size="lg"
            fullWidth
            className={PAY_BUTTON}
            loading={paying === 'mp_redirect'}
            onClick={() => {
              void payWithMercadoPago(order)
            }}
          >
            {paying === 'mp_redirect' ? CHECKOUT_COPY.connectingMp : payWithMpLabel(total)}
          </Button>
        </StepActions>
      </>
    )
  } else if (order !== null && method === 'card') {
    body = (
      <CardPaymentForm
        ref={cardForm}
        apiMode={apiMode}
        publicKey={mpPublicKey}
        installments={bin === null ? null : (installments.data ?? null)}
        onBinChange={setBin}
        onEdit={() => {
          cardEdited.current = true
        }}
        onSubmit={(submission) => payWithCardForm(order, submission)}
      >
        <LegalNotice />
        {processedBy}
        <StepActions onBack={onBack}>
          <Button
            size="lg"
            fullWidth
            className={PAY_BUTTON}
            loading={paying === 'card'}
            onClick={() => {
              void payWithCardForm(order)
            }}
          >
            {paying === 'card' ? CHECKOUT_COPY.processing : payLabel(total)}
          </Button>
        </StepActions>
      </CardPaymentForm>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {blocked ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-[14px]">
          <p role="alert" className="text-danger m-0">
            {CHECKOUT_COPY.blocked}
          </p>
          <Button variant="secondary" onClick={onViewCart}>
            {CHECKOUT_COPY.viewCart}
          </Button>
        </div>
      ) : null}
      {options}
      {order === null ? null : (
        <p className="m-0 text-[13px] text-neutral-400" aria-live="polite">
          {reservationNote(ORDER_RESERVATION_MINUTES, formatDateTime(order.reservedUntil))}
        </p>
      )}
      {payError === null ? null : (
        <p role="alert" className="text-danger m-0 text-[13.5px]">
          {payError}
        </p>
      )}
      {body}
      <ChallengeDialog
        url={challenge?.url ?? null}
        onClose={() => {
          if (challenge !== null) router.push(resultRoute(challenge.number))
        }}
      />
    </div>
  )
}
