// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useImperativeHandle, useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ShakeProps } from '@/components/motion'
import type { ApiClient, ApiFetch } from '@galpon/api-client'
import type { MockDb } from '@galpon/api-client/mock'
import { addProductToCart, CartHydrator, clearCart } from '@/features/cart'
import { hideToast } from '@/features/toast'
import { createApiClient } from '@galpon/api-client'
import { createMockDb, createMockFetch, DEFAULT_MOCK_DB_OPTIONS } from '@galpon/api-client/mock'
import { ApiClientProvider } from '@galpon/api-client/react'
import { formatPesos, pesos } from '@galpon/domain'
import { Checkout } from './Checkout'
import { CHECKOUT_COPY, payWithMpLabel } from './checkout.copy'
import { CHECKOUT_STORAGE_KEY, resetCheckoutStore } from './checkout.store'
import { readOrderSession, readOrderToken } from './order-session'
import { CHALLENGE_DONE_MESSAGE } from './result/mp-simulator'

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), search: '' }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push, replace: navigation.replace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(navigation.search),
  usePathname: () => '/checkout',
}))

// El temblor real anima con Motion; acá cada `Shake` marca su contenedor al temblar.
vi.mock('@/components/motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/motion')>()
  function MarkingShake({ ref, className, children }: ShakeProps): ReactNode {
    const element = useRef<HTMLDivElement>(null)
    useImperativeHandle(ref, () => ({
      shake: () => {
        element.current?.setAttribute('data-shaken', 'true')
      },
    }))
    return (
      <div ref={element} className={className}>
        {children}
      </div>
    )
  }
  return { ...actual, Shake: MarkingShake }
})

/** Yerba de la base simulada, sin opciones (no es un mate). */
const YERBA_ID = 'prd-yerba-canarias'

type User = ReturnType<typeof userEvent.setup>

/** Falla que el test provoca en el próximo `POST` a una ruta. */
interface Fault {
  /** Final de la dirección, por ejemplo `/card`, `/preference` o `/orders`. */
  suffix: string
  /** `network`: sin respuesta; `server`: un `502`. */
  kind: 'network' | 'server'
  /** Si el back alcanza a procesar el pedido y lo que se pierde es la respuesta. */
  committed: boolean
}

/** API simulada del test: registra los pedidos y puede cortar la red o devolver un 5xx. */
interface CheckoutTestApi {
  db: MockDb
  api: ApiClient
  requests: Request[]
  failNextOrder: () => void
  failNext: (fault: Fault) => void
}

function createCheckoutApi(): CheckoutTestApi {
  const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
  const mockFetch = createMockFetch({ getDb: () => db, latencyMs: 0 })
  const requests: Request[] = []
  let failOrder = false
  let fault: Fault | null = null
  const fetch: ApiFetch = async (request) => {
    requests.push(request.clone())
    if (failOrder && request.method === 'POST' && request.url.endsWith('/orders')) {
      failOrder = false
      throw new TypeError('Failed to fetch')
    }
    if (fault !== null && request.method === 'POST' && request.url.endsWith(fault.suffix)) {
      const { kind, committed } = fault
      fault = null
      if (committed) await mockFetch(request)
      if (kind === 'network') throw new TypeError('Failed to fetch')
      return new Response(
        JSON.stringify({ type: 'about:blank', title: 'Bad Gateway', status: 502 }),
        { status: 502, headers: { 'Content-Type': 'application/problem+json' } },
      )
    }
    return mockFetch(request)
  }
  const api = createApiClient({
    baseUrl: 'http://localhost/api/v1',
    fetch,
    getOrderToken: readOrderToken,
  })
  return {
    db,
    api,
    requests,
    failNextOrder: () => {
      failOrder = true
    },
    failNext: (next) => {
      fault = next
    },
  }
}

/** Precio de la yerba en la base simulada. */
function yerbaPrice(db: MockDb): number {
  const price = db.products.find((product) => product.id === YERBA_ID)?.priceArs
  if (price === null || price === undefined) throw new Error('La yerba tiene que tener precio')
  return price
}

/** Agrega la yerba al carrito como lo hace la tarjeta de producto. */
function addYerba(db: MockDb, quantity = 1): void {
  const product = db.products.find((candidate) => candidate.id === YERBA_ID)
  if (product === undefined) throw new Error('Falta la yerba en la base simulada')
  addProductToCart({
    product: {
      id: product.id,
      name: product.name,
      group: 'yerba',
      priceArs: product.priceArs,
      maxQuantity: 10,
      isPurchasable: true,
    },
    quantity,
  })
}

/** Dibuja el checkout como en la página, con el carrito montado como en el layout. */
function renderCheckout({ db, api }: CheckoutTestApi): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={api}>
        <CartHydrator />
        <Checkout apiMode="mock" mpPublicKey={null} shippingOptions={db.settings.shippingOptions} />
      </ApiClientProvider>
    </QueryClientProvider>,
  )
}

/** Pedidos a la API que van a una ruta (por el final de la dirección). */
function requestsTo(requests: readonly Request[], method: string, suffix: string): Request[] {
  return requests.filter(
    (request) => request.method === method && new URL(request.url).pathname.endsWith(suffix),
  )
}

/** Completa el paso 1 y continúa. */
async function fillContact(user: User): Promise<void> {
  await user.type(await screen.findByLabelText(CHECKOUT_COPY.email), 'lucia@ejemplo.com')
  await user.type(screen.getByLabelText(CHECKOUT_COPY.firstName), 'Lucía')
  await user.type(screen.getByLabelText(CHECKOUT_COPY.lastName), 'Pérez')
  await user.click(screen.getByRole('button', { name: CHECKOUT_COPY.next }))
}

/** Elige el retiro en persona en el paso 2 y continúa. */
async function choosePickup(user: User): Promise<void> {
  await user.click(await screen.findByRole('radio', { name: /Retiro en persona/ }))
  await user.click(screen.getByRole('button', { name: CHECKOUT_COPY.next }))
}

/** Completa los datos de la tarjeta de prueba con el titular indicado y espera las cuotas. */
async function fillCard(user: User, testApi: CheckoutTestApi, holder: string): Promise<void> {
  await user.type(await screen.findByLabelText('Número de tarjeta'), '4509953566233704')
  await user.type(screen.getByLabelText('Nombre del titular'), holder)
  await user.type(screen.getByLabelText('Vencimiento'), '1130')
  await user.type(screen.getByLabelText('CVC'), '123')
  await user.type(screen.getByLabelText('Número de documento'), '12345678')
  await waitFor(() => {
    expect(requestsTo(testApi.requests, 'POST', '/installments').length).toBeGreaterThan(0)
  })
}

/** Comprueba que `second` viene después de `first` en el documento. */
function expectBefore(first: HTMLElement, second: HTMLElement): void {
  expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
}

/** Espera a que se pueda elegir un medio de pago (la cotización llegó) y lo elige. */
async function choosePayment(user: User, name: RegExp): Promise<void> {
  const option = await screen.findByRole('radio', { name })
  await waitFor(() => {
    expect(option).toBeEnabled()
  })
  await user.click(option)
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  clearCart()
  resetCheckoutStore()
  navigation.push.mockReset()
  navigation.replace.mockReset()
  navigation.search = ''
  window.scrollTo = vi.fn()
})

afterEach(() => {
  hideToast()
  cleanup()
})

describe('Checkout', () => {
  it('con el carrito vacío muestra el aviso y el link a la tienda', async () => {
    renderCheckout(createCheckoutApi())
    expect(
      await screen.findByRole('heading', { name: CHECKOUT_COPY.emptyTitle }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: CHECKOUT_COPY.emptyAction })).toHaveAttribute(
      'href',
      '/tienda',
    )
  })

  it('al avanzar con errores el primer campo tiembla y recibe el foco', async () => {
    const user = userEvent.setup()
    const testApi = createCheckoutApi()
    addYerba(testApi.db)
    renderCheckout(testApi)

    await user.click(await screen.findByRole('button', { name: CHECKOUT_COPY.next }))
    const email = screen.getByLabelText(CHECKOUT_COPY.email)
    expect(email).toHaveFocus()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email.closest('[data-shaken]')).not.toBeNull()
    expect(document.querySelectorAll('[data-shaken]')).toHaveLength(1)
    expect(screen.getByLabelText(CHECKOUT_COPY.firstName)).toHaveAttribute('aria-invalid', 'true')

    await user.type(email, 'lucia@ejemplo.com')
    await user.type(screen.getByLabelText(CHECKOUT_COPY.firstName), 'Lucía')
    await user.click(screen.getByRole('button', { name: CHECKOUT_COPY.next }))
    expect(screen.getByLabelText(CHECKOUT_COPY.lastName)).toHaveFocus()

    await user.type(screen.getByLabelText(CHECKOUT_COPY.lastName), 'Pérez')
    await user.click(screen.getByRole('button', { name: CHECKOUT_COPY.next }))
    expect(
      await screen.findByRole('group', { name: CHECKOUT_COPY.shippingMethod }),
    ).toBeInTheDocument()

    // A domicilio pide la dirección: al avanzar vacía, el foco va a la calle.
    await user.click(screen.getByRole('radio', { name: /Envío a domicilio/ }))
    await user.click(screen.getByRole('button', { name: CHECKOUT_COPY.next }))
    expect(screen.getByLabelText(CHECKOUT_COPY.street)).toHaveFocus()
    expect(screen.getByLabelText(CHECKOUT_COPY.province)).toHaveAttribute('aria-invalid', 'true')
  })

  it('al recargar conserva el contacto y el envío, y vuelve al último paso completo', async () => {
    const user = userEvent.setup()
    const testApi = createCheckoutApi()
    addYerba(testApi.db)
    renderCheckout(testApi)
    await fillContact(user)
    await choosePickup(user)
    expect(
      await screen.findByRole('group', { name: CHECKOUT_COPY.paymentMethod }),
    ).toBeInTheDocument()

    // Recarga: se pierde la memoria, queda `sessionStorage`.
    cleanup()
    resetCheckoutStore()
    renderCheckout(testApi)
    expect(
      await screen.findByRole('group', { name: CHECKOUT_COPY.paymentMethod }),
    ).toBeInTheDocument()
    expect(screen.getByText('Gratis', { selector: 'aside span' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Contacto/ }))
    expect(await screen.findByLabelText(CHECKOUT_COPY.email)).toHaveValue('lucia@ejemplo.com')
    expect(sessionStorage.getItem(CHECKOUT_STORAGE_KEY)).not.toMatch(/card|token/i)
  })

  it('si el back responde 409 muestra qué cambió, actualiza el resumen y no cobra', async () => {
    const user = userEvent.setup()
    const testApi = createCheckoutApi()
    addYerba(testApi.db)
    renderCheckout(testApi)
    await fillContact(user)
    await choosePickup(user)

    // El precio sube después de que el carrito lo vio.
    const product = testApi.db.products.find((candidate) => candidate.id === YERBA_ID)
    if (product?.priceArs == null) throw new Error('La yerba tiene que tener precio')
    product.priceArs += 2000
    const newTotal = formatPesos(pesos(product.priceArs))

    await choosePayment(user, /Mercado Pago/)
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(CHECKOUT_COPY.conflictTitle)).toBeInTheDocument()
    expect(testApi.db.orders).toHaveLength(0)
    expect(testApi.requests.some((request) => request.url.includes('/payments/'))).toBe(false)
    expect(screen.queryByRole('button', { name: /^Pagar/ })).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getAllByText(newTotal, { selector: 'aside span' }).length).toBeGreaterThan(0)
    })
    const confirmAgain = screen.getByRole('button', { name: CHECKOUT_COPY.confirmAgain })
    await waitFor(() => {
      expect(confirmAgain).toBeEnabled()
    })
    await user.click(confirmAgain)
    expect(
      await screen.findByRole('button', { name: payWithMpLabel(newTotal) }),
    ).toBeInTheDocument()
    expect(testApi.db.orders).toHaveLength(1)
    const keys = requestsTo(testApi.requests, 'POST', '/orders').map((request) =>
      request.headers.get('Idempotency-Key'),
    )
    expect(keys).toHaveLength(2)
    expect(keys[0]).not.toBe(keys[1])
    expect(readOrderSession()).toMatchObject({ number: testApi.db.orders[0]?.number })
  })

  it('reintenta con la misma clave si no hubo respuesta y un doble clic paga una sola vez', async () => {
    const user = userEvent.setup()
    const testApi = createCheckoutApi()
    addYerba(testApi.db)
    renderCheckout(testApi)
    await fillContact(user)
    await choosePickup(user)

    testApi.failNextOrder()
    await choosePayment(user, /Mercado Pago/)
    expect(await screen.findByText(CHECKOUT_COPY.networkError)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: CHECKOUT_COPY.retry }))

    const total = formatPesos(pesos(yerbaPrice(testApi.db)))
    const pay = await screen.findByRole('button', { name: payWithMpLabel(total) })
    const [first, second] = requestsTo(testApi.requests, 'POST', '/orders')
    expect(first?.headers.get('Idempotency-Key')).toBe(second?.headers.get('Idempotency-Key'))
    expect(testApi.db.orders).toHaveLength(1)
    expect(screen.getByText(/Reservamos tu pedido por 30 minutos/)).toBeInTheDocument()

    await user.dblClick(pay)
    await waitFor(() => {
      expect(requestsTo(testApi.requests, 'POST', '/preference')).toHaveLength(1)
    })
    expect(screen.getByRole('button', { name: CHECKOUT_COPY.connectingMp })).toBeDisabled()
  })

  it('con ?pedido= del mismo carrito cancela el intento anterior y reutiliza el pedido', async () => {
    const user = userEvent.setup()
    const testApi = createCheckoutApi()
    addYerba(testApi.db)
    renderCheckout(testApi)
    await fillContact(user)
    await choosePickup(user)
    await choosePayment(user, /Mercado Pago/)
    const total = formatPesos(pesos(yerbaPrice(testApi.db)))
    await screen.findByRole('button', { name: payWithMpLabel(total) })
    const number = testApi.db.orders[0]?.number ?? ''

    // Vuelve desde el resultado con "Probar con otro medio".
    cleanup()
    resetCheckoutStore()
    navigation.search = `pedido=${number}`
    renderCheckout(testApi)
    await waitFor(() => {
      expect(requestsTo(testApi.requests, 'POST', '/cancel-payment')).toHaveLength(1)
    })
    expect(navigation.replace).toHaveBeenCalledWith('/checkout')
    await choosePayment(user, /Tarjeta de crédito o débito/)
    expect(await screen.findByRole('button', { name: `Pagar ${total}` })).toBeInTheDocument()
    expect(requestsTo(testApi.requests, 'POST', '/orders')).toHaveLength(1)

    // Si el carrito cambia, el próximo medio elegido crea otro pedido.
    await user.click(screen.getByRole('button', { name: /Envío/ }))
    addYerba(testApi.db)
    await user.click(await screen.findByRole('button', { name: CHECKOUT_COPY.next }))
    await choosePayment(user, /Mercado Pago/)
    await waitFor(() => {
      expect(testApi.db.orders).toHaveLength(2)
    })
  })

  it('si el carrito cambia con el medio ya elegido pide confirmar de nuevo y no deja sin salida', async () => {
    const user = userEvent.setup()
    const testApi = createCheckoutApi()
    addYerba(testApi.db)
    renderCheckout(testApi)
    await fillContact(user)
    await choosePickup(user)
    await choosePayment(user, /Mercado Pago/)
    const firstTotal = formatPesos(pesos(yerbaPrice(testApi.db)))
    await screen.findByRole('button', { name: payWithMpLabel(firstTotal) })

    // El pedido deja de valer, pero el radio sigue marcado y no vuelve a disparar `onChange`.
    addYerba(testApi.db)
    const confirmAgain = await screen.findByRole('button', { name: CHECKOUT_COPY.confirmAgain })
    expect(screen.getByText(CHECKOUT_COPY.orderChanged)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Pagar/ })).not.toBeInTheDocument()
    await waitFor(() => {
      expect(confirmAgain).toBeEnabled()
    })
    await user.click(confirmAgain)

    const newTotal = formatPesos(pesos(yerbaPrice(testApi.db) * 2))
    expect(
      await screen.findByRole('button', { name: payWithMpLabel(newTotal) }),
    ).toBeInTheDocument()
    expect(testApi.db.orders).toHaveLength(2)
    expect(screen.queryByText(CHECKOUT_COPY.orderChanged)).not.toBeInTheDocument()
  })

  it('con 3-D Secure abre el desafío, recuerda su dirección para retomarlo y al cerrar va al resultado', async () => {
    const user = userEvent.setup()
    const testApi = createCheckoutApi()
    addYerba(testApi.db)
    renderCheckout(testApi)
    await fillContact(user)
    await choosePickup(user)
    await choosePayment(user, /Tarjeta de crédito o débito/)

    await user.type(await screen.findByLabelText('Número de tarjeta'), '4509953566233704')
    await user.type(screen.getByLabelText('Nombre del titular'), '3DS')
    await user.type(screen.getByLabelText('Vencimiento'), '1130')
    await user.type(screen.getByLabelText('CVC'), '123')
    await user.type(screen.getByLabelText('Número de documento'), '12345678')
    await waitFor(() => {
      expect(requestsTo(testApi.requests, 'POST', '/installments').length).toBeGreaterThan(0)
    })

    const total = formatPesos(pesos(yerbaPrice(testApi.db)))
    await user.click(screen.getByRole('button', { name: `Pagar ${total}` }))
    const number = testApi.db.orders[0]?.number ?? ''
    const challengeUrl = `/checkout/mp-simulado?pedido=${number}&challenge=1`
    const dialog = await screen.findByRole('dialog')
    expect(dialog.querySelector('iframe')).toHaveAttribute('src', challengeUrl)
    expect(readOrderSession()?.challengeUrl).toBe(challengeUrl)
    expect(navigation.push).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: /Ya terminé/ }))
    expect(navigation.push).toHaveBeenCalledWith(`/checkout/resultado?pedido=${number}`)
  })

  it('cuando el desafío avisa que terminó va al resultado sin esperar "Ya terminé"', async () => {
    const user = userEvent.setup()
    const testApi = createCheckoutApi()
    addYerba(testApi.db)
    renderCheckout(testApi)
    await fillContact(user)
    await choosePickup(user)
    await choosePayment(user, /Tarjeta de crédito o débito/)
    await user.type(await screen.findByLabelText('Número de tarjeta'), '4509953566233704')
    await user.type(screen.getByLabelText('Nombre del titular'), '3DS')
    await user.type(screen.getByLabelText('Vencimiento'), '1130')
    await user.type(screen.getByLabelText('CVC'), '123')
    await user.type(screen.getByLabelText('Número de documento'), '12345678')
    await waitFor(() => {
      expect(requestsTo(testApi.requests, 'POST', '/installments').length).toBeGreaterThan(0)
    })
    const total = formatPesos(pesos(yerbaPrice(testApi.db)))
    await user.click(screen.getByRole('button', { name: `Pagar ${total}` }))
    await screen.findByRole('dialog')
    const number = testApi.db.orders[0]?.number ?? ''

    // Un aviso de otro origen no cuenta.
    window.dispatchEvent(
      new MessageEvent('message', { data: CHALLENGE_DONE_MESSAGE, origin: 'https://otro.example' }),
    )
    expect(navigation.push).not.toHaveBeenCalled()

    window.dispatchEvent(
      new MessageEvent('message', { data: CHALLENGE_DONE_MESSAGE, origin: window.location.origin }),
    )
    expect(navigation.push).toHaveBeenCalledWith(`/checkout/resultado?pedido=${number}`)
  })

  it('con tarjeta cobra el total confirmado y lleva al resultado del pedido', async () => {
    const user = userEvent.setup()
    const testApi = createCheckoutApi()
    addYerba(testApi.db)
    renderCheckout(testApi)
    await fillContact(user)
    await choosePickup(user)
    await choosePayment(user, /Tarjeta de crédito o débito/)

    await user.type(await screen.findByLabelText('Número de tarjeta'), '4509953566233704')
    await user.type(screen.getByLabelText('Nombre del titular'), 'APRO')
    await user.type(screen.getByLabelText('Vencimiento'), '1130')
    await user.type(screen.getByLabelText('CVC'), '123')
    await user.type(screen.getByLabelText('Número de documento'), '12345678')
    await waitFor(() => {
      expect(requestsTo(testApi.requests, 'POST', '/installments').length).toBeGreaterThan(0)
    })

    const total = formatPesos(pesos(yerbaPrice(testApi.db)))
    await user.click(screen.getByRole('button', { name: `Pagar ${total}` }))
    const number = testApi.db.orders[0]?.number ?? ''
    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith(`/checkout/resultado?pedido=${number}`)
    })
    expect(requestsTo(testApi.requests, 'POST', '/card')).toHaveLength(1)
    expect(readOrderSession()?.challengeUrl).toBeUndefined()
  })

  it.each(['network', 'server'] as const)(
    'con tarjeta, tras un error de tipo %s reenvía el mismo cuerpo con la misma clave y cobra una sola vez',
    async (kind) => {
      const user = userEvent.setup()
      const testApi = createCheckoutApi()
      addYerba(testApi.db)
      renderCheckout(testApi)
      await fillContact(user)
      await choosePickup(user)
      await choosePayment(user, /Tarjeta de crédito o débito/)
      await fillCard(user, testApi, 'APRO')
      const total = formatPesos(pesos(yerbaPrice(testApi.db)))

      // El back cobró, pero la respuesta no llegó.
      testApi.failNext({ suffix: '/card', kind, committed: true })
      await user.click(screen.getByRole('button', { name: `Pagar ${total}` }))
      expect(
        await screen.findByText(
          kind === 'network' ? CHECKOUT_COPY.networkError : CHECKOUT_COPY.payError,
        ),
      ).toBeInTheDocument()
      expect(navigation.push).not.toHaveBeenCalled()

      await user.click(screen.getByRole('button', { name: `Pagar ${total}` }))
      const number = testApi.db.orders[0]?.number ?? ''
      await waitFor(() => {
        expect(navigation.push).toHaveBeenCalledWith(`/checkout/resultado?pedido=${number}`)
      })
      const [first, second, ...others] = requestsTo(testApi.requests, 'POST', '/card')
      expect(others).toHaveLength(0)
      expect(second?.headers.get('Idempotency-Key')).toBe(first?.headers.get('Idempotency-Key'))
      expect(await second?.text()).toBe(await first?.text())
      expect(testApi.db.orders[0]?.intents).toHaveLength(1)
      expect(screen.queryByText(CHECKOUT_COPY.payError)).not.toBeInTheDocument()
    },
  )

  it('si la persona cambia la tarjeta después del error, el reintento es otro cobro con otra clave', async () => {
    const user = userEvent.setup()
    const testApi = createCheckoutApi()
    addYerba(testApi.db)
    renderCheckout(testApi)
    await fillContact(user)
    await choosePickup(user)
    await choosePayment(user, /Tarjeta de crédito o débito/)
    await fillCard(user, testApi, 'APRO')
    const total = formatPesos(pesos(yerbaPrice(testApi.db)))

    // La petición no llegó al back: no hay cobro.
    testApi.failNext({ suffix: '/card', kind: 'network', committed: false })
    await user.click(screen.getByRole('button', { name: `Pagar ${total}` }))
    expect(await screen.findByText(CHECKOUT_COPY.networkError)).toBeInTheDocument()

    const cvc = screen.getByLabelText('CVC')
    await user.clear(cvc)
    await user.type(cvc, '456')
    await user.click(screen.getByRole('button', { name: `Pagar ${total}` }))
    const number = testApi.db.orders[0]?.number ?? ''
    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith(`/checkout/resultado?pedido=${number}`)
    })
    const [first, second] = requestsTo(testApi.requests, 'POST', '/card')
    expect(second?.headers.get('Idempotency-Key')).not.toBe(first?.headers.get('Idempotency-Key'))
    expect(await second?.text()).not.toBe(await first?.text())
    expect(testApi.db.orders[0]?.intents).toHaveLength(1)
  })

  it('si POST /orders responde 5xx reintenta con la misma clave y no duplica el pedido', async () => {
    const user = userEvent.setup()
    const testApi = createCheckoutApi()
    addYerba(testApi.db)
    renderCheckout(testApi)
    await fillContact(user)
    await choosePickup(user)

    // El back creó el pedido, pero respondió 502.
    testApi.failNext({ suffix: '/orders', kind: 'server', committed: true })
    await choosePayment(user, /Mercado Pago/)
    expect(await screen.findByText(CHECKOUT_COPY.orderError)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: CHECKOUT_COPY.retry }))

    const total = formatPesos(pesos(yerbaPrice(testApi.db)))
    await screen.findByRole('button', { name: payWithMpLabel(total) })
    const [first, second] = requestsTo(testApi.requests, 'POST', '/orders')
    expect(first?.headers.get('Idempotency-Key')).toBe(second?.headers.get('Idempotency-Key'))
    expect(testApi.db.orders).toHaveLength(1)
  })

  it('si la preferencia de Mercado Pago responde 5xx, volver a pagar usa la misma clave', async () => {
    const user = userEvent.setup()
    const testApi = createCheckoutApi()
    addYerba(testApi.db)
    renderCheckout(testApi)
    await fillContact(user)
    await choosePickup(user)
    await choosePayment(user, /Mercado Pago/)
    const total = formatPesos(pesos(yerbaPrice(testApi.db)))
    const pay = await screen.findByRole('button', { name: payWithMpLabel(total) })

    testApi.failNext({ suffix: '/preference', kind: 'server', committed: true })
    await user.click(pay)
    expect(await screen.findByText(CHECKOUT_COPY.payError)).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: payWithMpLabel(total) }))

    await waitFor(() => {
      expect(requestsTo(testApi.requests, 'POST', '/preference')).toHaveLength(2)
    })
    const [first, second] = requestsTo(testApi.requests, 'POST', '/preference')
    expect(second?.headers.get('Idempotency-Key')).toBe(first?.headers.get('Idempotency-Key'))
    expect(testApi.db.orders[0]?.intents).toHaveLength(1)
  })

  it('un 409 al tocar "Pagar" con el pedido vencido avisa, no cobra y al volver a elegir crea un pedido nuevo', async () => {
    const user = userEvent.setup()
    const testApi = createCheckoutApi()
    addYerba(testApi.db)
    renderCheckout(testApi)
    await fillContact(user)
    await choosePickup(user)
    await choosePayment(user, /Mercado Pago/)
    const total = formatPesos(pesos(yerbaPrice(testApi.db)))
    const pay = await screen.findByRole('button', { name: payWithMpLabel(total) })

    // La reserva de 30 minutos venció mientras la persona miraba el paso 3.
    const [expiring] = testApi.db.orders
    if (expiring === undefined) throw new Error('Falta el pedido')
    expiring.reservedUntil = new Date(0).toISOString()
    await user.click(pay)

    expect(await screen.findByText(CHECKOUT_COPY.orderExpired)).toBeInTheDocument()
    expect(expiring.status).toBe('expired')
    expect(expiring.intents).toHaveLength(0)
    expect(requestsTo(testApi.requests, 'POST', '/card')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: payWithMpLabel(total) })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Mercado Pago/ })).not.toBeChecked()
    expect(readOrderSession()).toBeNull()

    await choosePayment(user, /Mercado Pago/)
    expect(await screen.findByRole('button', { name: payWithMpLabel(total) })).toBeInTheDocument()
    expect(testApi.db.orders).toHaveLength(2)
    expect(testApi.db.orders[1]?.status).toBe('pending_payment')
    const keys = requestsTo(testApi.requests, 'POST', '/orders').map((request) =>
      request.headers.get('Idempotency-Key'),
    )
    expect(keys).toHaveLength(2)
    expect(keys[0]).not.toBe(keys[1])
    expect(screen.queryByText(CHECKOUT_COPY.orderExpired)).not.toBeInTheDocument()
  })

  it.each([
    { name: 'Mercado Pago', option: /Mercado Pago/, pay: (total: string) => payWithMpLabel(total) },
    {
      name: 'tarjeta',
      option: /Tarjeta de crédito o débito/,
      pay: (total: string) => `Pagar ${total}`,
    },
  ])(
    'con $name el aviso de arrepentimiento y la aceptación de Términos y Privacidad van antes de "Pagar" (spec 14.1 y 14.6)',
    async ({ option, pay }) => {
      const user = userEvent.setup()
      const testApi = createCheckoutApi()
      addYerba(testApi.db)
      renderCheckout(testApi)
      await fillContact(user)
      await choosePickup(user)
      await choosePayment(user, option)

      const total = formatPesos(pesos(yerbaPrice(testApi.db)))
      const payButton = await screen.findByRole('button', { name: pay(total) })
      const withdrawal = screen.getByRole('link', { name: CHECKOUT_COPY.withdrawalLink })
      expect(withdrawal).toHaveAttribute('href', '/arrepentimiento')
      expect(withdrawal.closest('p')).toHaveTextContent(CHECKOUT_COPY.withdrawal)
      const terms = screen.getByRole('link', { name: CHECKOUT_COPY.termsLink })
      expect(terms).toHaveAttribute('href', '/terminos')
      expect(terms.closest('p')).toHaveTextContent(CHECKOUT_COPY.termsBefore)
      const privacy = screen.getByRole('link', { name: CHECKOUT_COPY.termsPrivacyLink })
      expect(privacy).toHaveAttribute('href', '/privacidad')
      expectBefore(withdrawal, payButton)
      expectBefore(terms, payButton)
      expectBefore(privacy, payButton)
      // La línea del candado va entre la nota del medio y los botones, como en el diseño.
      const processedBy = screen.getByText(CHECKOUT_COPY.processedBy)
      expectBefore(withdrawal, processedBy)
      expectBefore(processedBy, screen.getByRole('button', { name: CHECKOUT_COPY.back }))
      expectBefore(processedBy, payButton)
    },
  )

  it('la fila del envío del resumen dice "Envío" en el paso 1 y el método elegido en los pasos 2 y 3', async () => {
    const user = userEvent.setup()
    const testApi = createCheckoutApi()
    addYerba(testApi.db)
    renderCheckout(testApi)
    const summary = await screen.findByRole('complementary', { name: CHECKOUT_COPY.summaryTitle })
    expect(within(summary).getByText(CHECKOUT_COPY.shipping)).toBeInTheDocument()
    expect(within(summary).getByText(CHECKOUT_COPY.shippingPending)).toBeInTheDocument()

    await fillContact(user)
    await user.click(await screen.findByRole('radio', { name: /Envío a sucursal/ }))
    expect(within(summary).getByText('Envío a sucursal')).toBeInTheDocument()
    expect(within(summary).queryByText(CHECKOUT_COPY.shipping)).not.toBeInTheDocument()

    await choosePickup(user)
    expect(
      await screen.findByRole('group', { name: CHECKOUT_COPY.paymentMethod }),
    ).toBeInTheDocument()
    expect(within(summary).getByText('Retiro en persona')).toBeInTheDocument()
    expect(within(summary).getByText(CHECKOUT_COPY.free)).toBeInTheDocument()
  })

  it('si la persona vuelve con Atrás desde Mercado Pago (bfcache), el botón deja de decir "Conectando…"', async () => {
    const user = userEvent.setup()
    const testApi = createCheckoutApi()
    addYerba(testApi.db)
    renderCheckout(testApi)
    await fillContact(user)
    await choosePickup(user)
    await choosePayment(user, /Mercado Pago/)
    const total = formatPesos(pesos(yerbaPrice(testApi.db)))
    await user.click(await screen.findByRole('button', { name: payWithMpLabel(total) }))
    expect(await screen.findByRole('button', { name: CHECKOUT_COPY.connectingMp })).toBeDisabled()

    // Una página que se muestra sin salir del bfcache no cambia nada.
    act(() => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }))
    })
    expect(screen.getByRole('button', { name: CHECKOUT_COPY.connectingMp })).toBeDisabled()

    act(() => {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    })
    const again = await screen.findByRole('button', { name: payWithMpLabel(total) })
    expect(again).toBeEnabled()
    await user.click(again)
    await waitFor(() => {
      expect(requestsTo(testApi.requests, 'POST', '/preference')).toHaveLength(2)
    })
    const [first, second] = requestsTo(testApi.requests, 'POST', '/preference')
    expect(second?.headers.get('Idempotency-Key')).toBe(first?.headers.get('Idempotency-Key'))
  })
})
