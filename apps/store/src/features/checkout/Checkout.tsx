'use client'

import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ApiMode } from '@/lib/env'
import type { ShippingOption } from '@galpon/api-client'
import type { ShippingMethod } from '@galpon/domain'
import { Float, Reveal, useScrollTopOnStep } from '@/components/motion'
import { Button } from '@/components/ui'
import { useSession } from '@/features/account'
import {
  cartHash,
  openCart,
  useCart,
  useCartQuoteInput,
  useCartSync,
  useCartView,
} from '@/features/cart'
import { asRoute } from '@/lib/routes'
import { cancelPayment } from '@galpon/api-client'
import { myAddressesQuery, useApiClient } from '@galpon/api-client/react'
import { pesos, sumPesos } from '@galpon/domain'
import { orderFingerprint, shippingCost } from './checkout-order'
import { CHECKOUT_COPY } from './checkout.copy'
import { ensureCheckoutHydrated, useCheckoutStore } from './checkout.store'
import { CheckoutSteps } from './CheckoutSteps'
import { CheckoutSummary } from './CheckoutSummary'
import { ContactStep } from './ContactStep'
import { readOrderSession } from './order-session'
import { PaymentStep } from './PaymentStep'
import { ShippingStep } from './ShippingStep'
import { useCheckoutOrder } from './use-checkout-order'

/** Props de {@link Checkout}. */
export interface CheckoutProps {
  /** Modo de la API (desde el servidor, `getStoreEnv().apiMode`). */
  apiMode: ApiMode
  /** Clave pública de Mercado Pago (desde el servidor), o `null`. */
  mpPublicKey: string | null
  /** Opciones de envío de los ajustes públicos (`PublicSettings.shippingOptions`). */
  shippingOptions: readonly ShippingOption[]
}

/** Retardo con el que entra el contenido de cada paso, después del título (diseño: 120 ms). */
const STEP_REVEAL_DELAY_MS = 120

/** Duración de la entrada del contenido de cada paso (diseño: `data-dur="700"`). */
const STEP_REVEAL_MS = 700

/** Props de {@link Bone}. */
interface BoneProps {
  /** Medidas del bloque. */
  className: string
}

/** Bloque gris que late mientras carga. */
function Bone({ className }: BoneProps): ReactNode {
  return <div className={`rounded-md bg-neutral-800 motion-safe:animate-pulse ${className}`} />
}

/**
 * Esqueleto del checkout mientras se leen el carrito y los pasos guardados (spec 9.7). Es también
 * el `fallback` del `<Suspense>` de la página.
 */
export function CheckoutSkeleton(): ReactNode {
  return (
    <div
      aria-busy="true"
      className="mx-auto flex max-w-[1280px] flex-wrap gap-x-14 gap-y-10 px-[clamp(20px,5vw,64px)] pt-[clamp(40px,6vw,72px)]"
    >
      <div className="flex min-w-0 flex-[1.5_1_480px] flex-col gap-7">
        <Bone className="h-3 w-24" />
        <Bone className="h-14 w-3/4" />
        <Bone className="h-6 w-full" />
        <Bone className="h-48 w-full" />
      </div>
      <Bone className="h-72 max-w-[420px] flex-[1_1_300px]" />
    </div>
  )
}

/** Carrito vacío: "Tu carrito está vacío." y "Ir a la tienda". */
function EmptyCheckout(): ReactNode {
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col items-start gap-[18px] px-[clamp(20px,5vw,64px)] py-[120px]">
      <Float>
        <Image
          src="/brand/galpon-mark.png"
          alt=""
          width={60}
          height={80}
          className="h-auto w-[60px]"
        />
      </Float>
      <h1 className="m-0 text-[44px] tracking-[-0.03em]">{CHECKOUT_COPY.emptyTitle}</h1>
      <Button asChild className="min-h-[44px] px-[20px]! no-underline">
        <Link href={asRoute('/tienda')}>{CHECKOUT_COPY.emptyAction}</Link>
      </Button>
    </div>
  )
}

/**
 * Checkout de tres pasos (spec 14): Contacto, Envío y Pago, con el resumen lateral "Tu pedido".
 * Concilia el carrito al entrar, guarda los pasos 1 y 2 en `sessionStorage` (una recarga vuelve al
 * último paso completo) y crea el pedido al elegir el medio de pago (Ruling P3-5).
 *
 * Acepta `?pedido=GLP-…` (desde "Probar con otro medio" del resultado): si ese es el pedido en curso
 * de la pestaña y el carrito no cambió, cancela el intento anterior y retoma el paso 3 con el mismo
 * pedido. Lee la URL con `useSearchParams`, así que va dentro de un `<Suspense>`.
 *
 * @param props - Ver {@link CheckoutProps}.
 */
export function Checkout({ apiMode, mpPublicKey, shippingOptions }: CheckoutProps): ReactNode {
  const api = useApiClient()
  const router = useRouter()
  const pedido = useSearchParams().get('pedido')
  const syncCart = useCartSync()
  const { lines, hasHydrated: cartReady } = useCart()
  const quoteInput = useCartQuoteInput()
  const { view, isError, isUpdating } = useCartView({ enabled: true })
  const session = useSession()
  const addresses = useQuery({
    ...myAddressesQuery(api),
    enabled: session.status === 'authenticated',
  })
  const ready = useCheckoutStore((state) => state.hasHydrated)
  const step = useCheckoutStore((state) => state.step)
  const contact = useCheckoutStore((state) => state.contact)
  const shipping = useCheckoutStore((state) => state.shipping)
  const [draftMethod, setDraftMethod] = useState<ShippingMethod | null>(null)
  const resumed = useRef(false)

  const options = useMemo(
    () => shippingOptions.filter((option) => option.enabled),
    [shippingOptions],
  )
  const hash = useMemo(() => cartHash(lines), [lines])

  useEffect(() => {
    ensureCheckoutHydrated()
  }, [])
  useEffect(() => {
    void syncCart()
  }, [syncCart])
  useScrollTopOnStep(step)

  useEffect(() => {
    if (resumed.current || !ready || !cartReady || pedido === null) return
    resumed.current = true
    const current = readOrderSession()
    const fingerprint = orderFingerprint(hash, contact, shipping)
    if (
      current?.number === pedido &&
      current.cartHash === hash &&
      fingerprint !== null &&
      useCheckoutStore.getState().resumePayment({ number: pedido, fingerprint })
    ) {
      // "Probar con otro medio": el intento anterior se cancela; sin intento activo no hace nada.
      void cancelPayment(api, pedido).catch(() => undefined)
    }
    router.replace(asRoute('/checkout'))
  }, [api, router, pedido, ready, cartReady, hash, contact, shipping])

  const savedMethod =
    shipping !== null && options.some((option) => option.method === shipping.method)
      ? shipping.method
      : (options[0]?.method ?? null)
  const method = step === 0 ? null : step === 1 ? (draftMethod ?? savedMethod) : savedMethod
  const shippingArs = shippingCost(options, method)
  const shippingLabel = options.find((option) => option.method === method)?.label ?? null
  const loading = view.lines.some((line) => line.status === 'loading')
  const totalArs = sumPesos([pesos(view.totals.subtotalArs), pesos(shippingArs ?? 0)])
  const expectedTotalArs =
    step === 2 && !loading && !isUpdating && !isError && view.canCheckout && shippingArs !== null
      ? totalArs
      : null
  const checkout = useCheckoutOrder({ cartHash: hash, items: quoteInput.items, expectedTotalArs })

  if (!ready || !cartReady) return <CheckoutSkeleton />
  if (lines.length === 0) return <EmptyCheckout />

  const goToStep = (next: number): void => {
    setDraftMethod(null)
    useCheckoutStore.getState().goToStep(next)
  }

  return (
    <section className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-x-14 gap-y-10 px-[clamp(20px,5vw,64px)] pt-[clamp(40px,6vw,72px)]">
      <div className="flex min-w-0 flex-[1.5_1_480px] flex-col gap-7">
        <div className="flex flex-col gap-[14px]">
          <span className="text-accent flex items-center gap-3 text-[12px] tracking-[0.14em] uppercase">
            <span aria-hidden="true" className="bg-accent h-px w-7" />
            {CHECKOUT_COPY.eyebrow}
          </span>
          <Reveal
            kind="up"
            as="h1"
            className="m-0 text-[clamp(36px,4.6vw,60px)] leading-none tracking-[-0.035em]"
          >
            {CHECKOUT_COPY.title}
          </Reveal>
        </div>
        <CheckoutSteps step={step} onSelect={goToStep} />
        {/* Cada paso entra con su propio Reveal (`key`), como el `data-reveal="up"` del diseño. */}
        <Reveal key={step} kind="up" delay={STEP_REVEAL_DELAY_MS} duration={STEP_REVEAL_MS}>
          {step === 0 ? (
            <ContactStep
              saved={contact}
              customer={session.customer}
              onSubmit={(values) => {
                useCheckoutStore.getState().saveContact(values)
              }}
            />
          ) : null}
          {step === 1 ? (
            <ShippingStep
              saved={shipping}
              options={options}
              email={contact?.email.trim() ?? ''}
              addresses={addresses.data ?? []}
              onMethodChange={setDraftMethod}
              onBack={() => {
                goToStep(0)
              }}
              onSubmit={(values) => {
                setDraftMethod(null)
                useCheckoutStore.getState().saveShipping(values)
              }}
            />
          ) : null}
          {step === 2 ? (
            <PaymentStep
              apiMode={apiMode}
              mpPublicKey={mpPublicKey}
              checkout={checkout}
              canConfirm={expectedTotalArs !== null}
              blocked={view.lines.some((line) => line.status === 'sold-out')}
              onViewCart={openCart}
              onBack={() => {
                goToStep(1)
              }}
            />
          ) : null}
        </Reveal>
      </div>
      <CheckoutSummary
        view={view}
        loading={loading}
        error={isError}
        shippingArs={method === null ? null : shippingArs}
        shippingLabel={shippingLabel}
        totalArs={totalArs}
      />
    </section>
  )
}
