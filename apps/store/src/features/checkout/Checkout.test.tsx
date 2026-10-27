// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
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

/** API simulada del test: registra los pedidos y puede cortar la red en el próximo `POST /orders`. */
interface CheckoutTestApi {
  db: MockDb
  api: ApiClient
  requests: Request[]
  failNextOrder: () => void
}

function createCheckoutApi(): CheckoutTestApi {
  const db = createMockDb(DEFAULT_MOCK_DB_OPTIONS)
  const mockFetch = createMockFetch({ getDb: () => db, latencyMs: 0 })
  const requests: Request[] = []
  let failOrder = false
  const fetch: ApiFetch = async (request) => {
    requests.push(request.clone())
    if (failOrder && request.method === 'POST' && request.url.endsWith('/orders')) {
      failOrder = false
      throw new TypeError('Failed to fetch')
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
  })
})
