'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui'
import { asRoute } from '@/lib/routes'
import { orderQuery, useApiClient } from '@galpon/api-client/react'
import { formatPesos, isOrderNumber, pesos } from '@galpon/domain'
import type { MockPaymentResult } from './mp-simulator'
import { readOrderSession } from '../order-session'
import { assignLocation } from './browser-location'
import { notifyChallengeDone, resolveMockPayment } from './mp-simulator'
import { RESULT_COPY } from './result.copy'

const COPY = RESULT_COPY.simulator

/**
 * Azul de Mercado Pago, solo para que el simulador se reconozca como tal. Es el tono oscuro de la
 * marca: con el celeste (`#009ee3`) el texto blanco no llega al contraste AA (3:1 en lugar de 4,5:1).
 */
const MP_BLUE = '#0070b3'

/** Encabezado azul con texto blanco (5,3:1). */
const MP_HEADER_STYLE: CSSProperties = { background: MP_BLUE, color: '#ffffff' }

/**
 * Tarjeta clara, como la página de Mercado Pago. Los botones de la tienda toman sus colores de
 * `--color-foreground` y `--color-accent`, pensados para el fondo oscuro: adentro de la tarjeta se
 * redefinen para que se lean sobre blanco.
 */
const MP_CARD_STYLE: CSSProperties & Record<`--${string}`, string> = {
  background: '#ffffff',
  color: '#333333',
  '--color-foreground': '#333333',
  '--color-accent': MP_BLUE,
}

/** Props de {@link SimulatorPanel}. */
interface SimulatorPanelProps {
  /** Número del pedido. */
  number: string
  /** Intento de la preferencia, o `null` en el desafío 3-D Secure (el intento activo). */
  intent: string | null
}

/** El pedido guardado en `sessionStorage` no avisa cambios: se lee en cada render. */
function subscribeToNothing(): () => void {
  return () => undefined
}

/** Si el pedido de la dirección es el de la pestaña (en el servidor, no). */
function useIsTabOrder(number: string): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => readOrderSession()?.number === number,
    () => false,
  )
}

/** Panel con el pedido, el total (si es el de la pestaña) y los botones del resultado. */
function SimulatorPanel({ number, intent }: SimulatorPanelProps): ReactNode {
  const api = useApiClient()
  const isTabOrder = useIsTabOrder(number)
  const order = useQuery({ ...orderQuery(api, number), enabled: isTabOrder })
  const [busy, setBusy] = useState<MockPaymentResult | null>(null)
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)
  const challenge = intent === null

  async function choose(result: MockPaymentResult): Promise<void> {
    setBusy(result)
    setFailed(false)
    try {
      const returnUrl = await resolveMockPayment({ number, intent, result })
      if (challenge) {
        notifyChallengeDone()
        setDone(true)
      } else {
        assignLocation(returnUrl)
      }
    } catch {
      setBusy(null)
      setFailed(true)
    }
  }

  /** Botón de un resultado. */
  function option(result: MockPaymentResult, label: string, primary: boolean): ReactNode {
    return (
      <Button
        variant={primary ? 'primary' : 'secondary'}
        fullWidth
        disabled={busy !== null && busy !== result}
        loading={busy === result}
        onClick={() => {
          void choose(result)
        }}
      >
        {label}
      </Button>
    )
  }

  return (
    <div className="overflow-hidden rounded-[14px] shadow-sm" style={MP_CARD_STYLE}>
      <header className="flex items-center justify-between gap-3 px-5 py-4" style={MP_HEADER_STYLE}>
        <span className="text-[18px] font-semibold">{COPY.brand}</span>
        <span className="text-[12px] tracking-[0.08em] uppercase">{COPY.badge}</span>
      </header>
      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[22px] leading-tight">
            {challenge ? COPY.challengeTitle : COPY.title}
          </h1>
          {challenge ? <p className="m-0 text-[14px]">{COPY.challengeText}</p> : null}
        </div>
        <dl className="m-0 flex flex-col gap-1 text-[15px]">
          <div className="flex justify-between gap-3">
            <dt>{COPY.order}</dt>
            <dd className="m-0 tabular-nums">{number}</dd>
          </div>
          {order.data === undefined ? null : (
            <div className="flex justify-between gap-3 text-[18px]">
              <dt>{COPY.total}</dt>
              <dd className="m-0 tabular-nums">{formatPesos(pesos(order.data.totalArs))}</dd>
            </div>
          )}
        </dl>
        {done ? (
          <p role="status" className="m-0 text-[15px]">
            {COPY.closeWindow}
          </p>
        ) : challenge ? (
          <div className="flex flex-col gap-3">
            {option('approved', COPY.confirm, true)}
            {option('rejected', COPY.cancel, false)}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {option('approved', COPY.approve, true)}
            {option('pending', COPY.leavePending, false)}
            {option('rejected', COPY.reject, false)}
          </div>
        )}
        {failed ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="m-0 text-[14px]" style={{ color: '#b3261e' }}>
              {COPY.error}
            </p>
            <Link
              href={asRoute(`/checkout/resultado?pedido=${encodeURIComponent(number)}`)}
              className="text-[14px] underline underline-offset-4"
            >
              {COPY.backToResult}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Simulador de la página de Mercado Pago (spec 13.2, solo modo de prueba). Lee la dirección:
 *
 * - `?pedido=GLP-…&intent=…` (la `initPoint` de la preferencia): "Aprobar", "Dejar pendiente" o
 *   "Rechazar" aplican el resultado y vuelven a `/checkout/resultado?pedido=…` con una carga
 *   completa, como Mercado Pago.
 * - `?pedido=GLP-…&challenge=1` (el desafío 3-D Secure, dentro del iframe del diálogo):
 *   "Confirmar" aprueba y "Cancelar" rechaza; después avisa a la página que lo abrió
 *   (`postMessage` al mismo origen) y pide cerrar la ventana.
 *
 * Muestra el número del pedido y, si es el de la pestaña, el total que confirmó la API.
 */
export function MercadoPagoSimulator(): ReactNode {
  const params = useSearchParams()
  const number = params.get('pedido')
  const challenge = params.get('challenge') === '1'
  const intent = params.get('intent')
  const hasIntent = challenge || (intent !== null && intent !== '')
  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-5 px-4 py-[clamp(32px,6vw,72px)]">
      {number !== null && isOrderNumber(number) && hasIntent ? (
        <SimulatorPanel number={number} intent={challenge ? null : intent} />
      ) : (
        <p role="alert" className="m-0 text-[15px] text-neutral-300">
          {COPY.invalid}
        </p>
      )}
    </div>
  )
}
