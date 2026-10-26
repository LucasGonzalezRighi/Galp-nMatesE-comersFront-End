// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CartLine } from '@galpon/domain'
import type { KitProduct } from './kit-products'
import { clearCart, closeCart, KIT_CART_OPEN_DELAY_MS, useCart } from '../cart'
import { hideToast, Toaster } from '../toast'
import { KIT_ADVANCE_DELAY_MS, useKitStore } from './kit.store'
import { KitBuilder } from './KitBuilder'
import { CATALOG, kitProduct } from './test/support'

/** Parámetros de la dirección que ve la página: `/kit?mate=…` los cambia cada test. */
const navigation = vi.hoisted(() => ({ params: new URLSearchParams() }))

vi.mock('next/navigation', () => ({
  useSearchParams: (): URLSearchParams => navigation.params,
}))

/** Muestra el carrito por su API pública: líneas y si el panel está abierto. */
function CartProbe(): ReactNode {
  const { lines, isOpen } = useCart()
  return <pre data-testid="cart">{JSON.stringify({ lines, isOpen })}</pre>
}

/** Lo que muestra `CartProbe`. */
function cart(): { lines: CartLine[]; isOpen: boolean } {
  return JSON.parse(screen.getByTestId('cart').textContent) as {
    lines: CartLine[]
    isOpen: boolean
  }
}

/** Dibuja el asistente con el aviso y la sonda del carrito. */
function renderKit(products: readonly KitProduct[] = CATALOG, discountPercent = 10): void {
  render(
    <>
      <KitBuilder products={products} discountPercent={discountPercent} />
      <Toaster />
      <CartProbe />
    </>,
  )
}

/** Deja pasar el tiempo (los temporizadores del kit y del carrito son falsos). */
function wait(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

/** La opción de un paso por su nombre: se busca dentro de la grilla, no en la barra de pasos. */
function option(name: string): HTMLElement {
  const grid = screen.getByRole('group', { name: /^Elegí / })
  return within(grid).getByRole('button', { name: new RegExp(name) })
}

/** Un paso de la barra por su nombre ("Mate", "Bombilla", "Yerba" o "Resumen"). */
function step(name: string): HTMLElement {
  const bar = screen.getByRole('navigation', { name: 'Pasos del kit' })
  return within(bar).getByRole('button', { name: new RegExp(`^${name}`) })
}

/** Elige una opción por su nombre y espera el avance automático al paso siguiente. */
function choose(name: string): void {
  fireEvent.click(option(name))
  wait(KIT_ADVANCE_DELAY_MS)
}

/** Arma el kit completo (mate, bombilla y yerba) y queda en el Resumen. */
function buildFullKit(): void {
  choose('Mate Imperial Premium')
  choose('Bombillón Curvo')
  choose('Yerba Canarias')
}

/** El botón "Agregar kit al carrito". */
function addButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Agregar kit al carrito' })
}

const scrollTo = vi.fn()

beforeEach(() => {
  vi.useFakeTimers()
  navigation.params = new URLSearchParams()
  scrollTo.mockClear()
  window.scrollTo = scrollTo
  act(() => {
    useKitStore.getState().reset()
    useKitStore.getState().setLeather('Negro')
    clearCart()
    closeCart()
  })
})

afterEach(() => {
  act(() => {
    hideToast()
    useKitStore.getState().reset()
  })
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('KitBuilder: pasos y opciones', () => {
  it('abre en el paso Mate con solo las opciones comprables y el panel vacío', () => {
    renderKit()

    expect(screen.getByRole('heading', { name: 'Elegí el mate' })).toBeVisible()
    expect(
      screen.getByText('2 mates entre imperiales, torpedos, camioneros y rancheros.'),
    ).toBeVisible()
    expect(option('Mate Imperial Premium')).toBeVisible()
    expect(option('Mate Torpedo')).toBeVisible()
    expect(screen.queryByText('Mate Agotado')).toBeNull()
    expect(screen.queryByText('Bombillón Curvo')).toBeNull()

    const steps = screen.getByRole('navigation', { name: 'Pasos del kit' })
    expect(within(steps).getAllByText('Sin elegir')).toHaveLength(3)
    expect(within(steps).getByText('Faltan 3')).toBeVisible()
    const panel = screen.getByRole('complementary', { name: 'Resumen del kit' })
    expect(within(panel).getByText('Descuento kit −10%')).toBeVisible()
    expect(within(panel).getByText('Te falta elegir el mate, la bombilla, la yerba.')).toBeVisible()
    expect(within(panel).queryByRole('group', { name: 'Cuero' })).toBeNull()
    expect(addButton()).toBeDisabled()
  })

  it('al elegir una opción queda marcada y avanza sola recién a los 420 ms', () => {
    renderKit()

    fireEvent.click(option('Mate Torpedo'))

    expect(option('Mate Torpedo')).toHaveAttribute('aria-pressed', 'true')
    wait(KIT_ADVANCE_DELAY_MS - 1)
    expect(screen.getByRole('heading', { name: 'Elegí el mate' })).toBeVisible()

    wait(1)
    expect(screen.getByRole('heading', { name: 'Elegí la bombilla' })).toBeVisible()
    const steps = screen.getByRole('navigation', { name: 'Pasos del kit' })
    expect(within(steps).getByText('Mate Torpedo')).toBeVisible()
    expect(within(steps).getByText('Faltan 2')).toBeVisible()
    // Al cambiar de paso la página sube con scroll suave.
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('con las tres piezas llega al Resumen con "Listo para agregar" y los importes del kit', () => {
    renderKit()

    buildFullKit()

    expect(screen.getByRole('heading', { name: 'Tu kit' })).toBeVisible()
    expect(screen.getByText('Revisá las piezas. Tocá cualquiera para cambiarla.')).toBeVisible()
    const steps = screen.getByRole('navigation', { name: 'Pasos del kit' })
    expect(within(steps).getByText('Listo para agregar')).toBeVisible()
    const panel = screen.getByRole('complementary', { name: 'Resumen del kit' })
    expect(within(panel).getByText('$75.997')).toBeVisible()
    expect(within(panel).getByText('−$7.600')).toBeVisible()
    expect(within(panel).getByText('$68.397')).toBeVisible()
    expect(within(panel).queryByText(/Te falta elegir/)).toBeNull()
    expect(addButton()).toBeEnabled()
  })

  it('los pasos se pueden tocar en cualquier orden y el Resumen cambia una pieza', () => {
    renderKit()

    fireEvent.click(step('Resumen'))
    expect(screen.getByRole('heading', { name: 'Tu kit' })).toBeVisible()

    fireEvent.click(step('Yerba'))
    expect(screen.getByRole('heading', { name: 'Elegí la yerba' })).toBeVisible()

    fireEvent.click(step('Resumen'))
    // En el Resumen, tocar una fila lleva al paso de esa pieza.
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Tu kit' })).getByRole('button', {
        name: /Bombilla.*Sin elegir/,
      }),
    )
    expect(screen.getByRole('heading', { name: 'Elegí la bombilla' })).toBeVisible()
  })

  it('un paso sin opciones comprables lo avisa', () => {
    renderKit(CATALOG.filter((product) => product.group !== 'yerba'))

    fireEvent.click(step('Yerba'))

    expect(screen.getByText('No hay yerbas disponibles por ahora')).toBeVisible()
  })

  it('cambiar de paso antes de los 420 ms cancela el avance automático', () => {
    renderKit()

    fireEvent.click(option('Mate Torpedo'))
    fireEvent.click(step('Resumen'))
    wait(KIT_ADVANCE_DELAY_MS * 2)

    expect(screen.getByRole('heading', { name: 'Tu kit' })).toBeVisible()
  })

  it('elegir el cuero cambia las muestras y se muestra el nombre', () => {
    renderKit()
    choose('Mate Imperial Premium')

    const colors = screen.getByRole('group', { name: 'Cuero' })
    expect(within(colors).getAllByRole('button')).toHaveLength(4)
    expect(within(colors).getByRole('button', { name: 'Negro' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(within(colors).getByRole('button', { name: 'Borravino' }))

    expect(within(colors).getByRole('button', { name: 'Borravino' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('Cuero · Borravino')).toBeVisible()
  })
})

describe('KitBuilder: agregar al carrito', () => {
  it('agrega el kit con su cuero, avisa, abre el carrito a los 850 ms y reinicia sin tocar el cuero', () => {
    renderKit()
    choose('Mate Imperial Premium')
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Cuero' })).getByRole('button', {
        name: 'Borravino',
      }),
    )
    choose('Bombillón Curvo')
    choose('Yerba Canarias')

    fireEvent.click(addButton())

    expect(cart().lines).toEqual([
      {
        type: 'kit',
        mateId: 'm1',
        bombillaId: 'b1',
        yerbaId: 'y1',
        leather: 'Borravino',
        quantity: 1,
      },
    ])
    expect(screen.getByRole('status', { hidden: true })).toHaveTextContent(
      'Kit agregado al carrito',
    )
    expect(screen.getByRole('status', { hidden: true })).toHaveTextContent(
      'Descuento de 10% aplicado',
    )
    // El carrito se abre a los 850 ms y no antes.
    expect(cart().isOpen).toBe(false)
    wait(KIT_CART_OPEN_DELAY_MS - 1)
    expect(cart().isOpen).toBe(false)
    wait(1)
    expect(cart().isOpen).toBe(true)

    // El kit vuelve al inicio, pero el cuero se conserva.
    expect(screen.getByRole('heading', { name: 'Elegí el mate' })).toBeVisible()
    expect(addButton()).toBeDisabled()
    choose('Mate Torpedo')
    expect(
      within(screen.getByRole('group', { name: 'Cuero' })).getByRole('button', {
        name: 'Borravino',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('un doble clic rápido agrega un solo kit', () => {
    renderKit()
    buildFullKit()
    const button = addButton()

    act(() => {
      button.click()
      button.click()
    })

    expect(cart().lines).toHaveLength(1)
    expect(cart().lines[0]).toMatchObject({ type: 'kit', quantity: 1 })
  })

  it('no supera el tope de compra: sin stock para otro kit no agrega y deja las piezas elegidas', () => {
    const limited = CATALOG.map((product) =>
      ['m1', 'b1', 'y1'].includes(product.id) ? { ...product, maxQuantity: 1 } : product,
    )
    renderKit(limited)
    buildFullKit()
    fireEvent.click(addButton())
    expect(cart().lines).toHaveLength(1)

    buildFullKit()
    fireEvent.click(addButton())

    expect(cart().lines).toHaveLength(1)
    expect(cart().lines[0]).toMatchObject({ quantity: 1 })
    expect(screen.getByRole('status', { hidden: true })).toHaveTextContent(
      'No hay stock para otro kit',
    )
    // No se agregó: las piezas siguen elegidas, en el Resumen.
    expect(screen.getByRole('heading', { name: 'Tu kit' })).toBeVisible()
    expect(addButton()).toBeEnabled()
  })

  it('con stock para dos kits, el tercero queda afuera y los dos primeros se suman', () => {
    const limited = CATALOG.map((product) =>
      ['m1', 'b1', 'y1'].includes(product.id) ? { ...product, maxQuantity: 2 } : product,
    )
    renderKit(limited)

    buildFullKit()
    fireEvent.click(addButton())
    buildFullKit()
    fireEvent.click(addButton())
    buildFullKit()
    fireEvent.click(addButton())

    expect(cart().lines).toHaveLength(1)
    expect(cart().lines[0]).toMatchObject({ type: 'kit', quantity: 2 })
  })

  it('"Empezar de nuevo" reinicia piezas y paso, pero no el cuero', () => {
    renderKit()
    choose('Mate Imperial Premium')
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Cuero' })).getByRole('button', { name: 'Crudo' }),
    )
    choose('Bombillón Curvo')

    fireEvent.click(screen.getByRole('button', { name: 'Empezar de nuevo' }))

    expect(screen.getByRole('heading', { name: 'Elegí el mate' })).toBeVisible()
    const steps = screen.getByRole('navigation', { name: 'Pasos del kit' })
    expect(within(steps).getByText('Faltan 3')).toBeVisible()
    expect(useKitStore.getState().leather).toBe('Crudo')
    expect(cart().lines).toEqual([])
  })
})

describe('KitBuilder: /kit?mate=', () => {
  it('elige el mate comprable del link y abre en Bombilla', () => {
    navigation.params = new URLSearchParams('mate=mate-dos')

    renderKit()

    expect(screen.getByRole('heading', { name: 'Elegí la bombilla' })).toBeVisible()
    const steps = screen.getByRole('navigation', { name: 'Pasos del kit' })
    expect(within(steps).getByText('Mate Torpedo')).toBeVisible()
    expect(within(steps).getByText('Faltan 2')).toBeVisible()
  })

  it('conserva lo que ya estaba elegido y el cuero', () => {
    act(() => {
      useKitStore.getState().setLeather('Marrón')
      useKitStore.getState().pickPiece('yerba', 'y1')
      vi.advanceTimersByTime(KIT_ADVANCE_DELAY_MS)
    })
    navigation.params = new URLSearchParams('mate=mate-uno')

    renderKit()

    const steps = screen.getByRole('navigation', { name: 'Pasos del kit' })
    expect(within(steps).getByText('Mate Imperial Premium')).toBeVisible()
    expect(within(steps).getByText('Yerba Canarias')).toBeVisible()
    expect(within(steps).getByText('Faltan 1')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Elegí la bombilla' })).toBeVisible()
    expect(useKitStore.getState().leather).toBe('Marrón')
  })

  it.each([
    ['un slug que no existe', 'mate=no-existe'],
    ['una bombilla', 'mate=bombillon-curvo'],
    ['un mate sin stock', 'mate=mate-agotado'],
    ['mayúsculas', 'mate=MATE-UNO'],
    ['un recorrido de carpetas', 'mate=..%2Fmate-uno'],
    ['un porcentaje suelto', 'mate=%25'],
    ['un script', 'mate=%3Cscript%3Ealert(1)%3C%2Fscript%3E'],
    ['el parámetro vacío', 'mate='],
  ])('se ignora con %s', (_caso, search) => {
    navigation.params = new URLSearchParams(search)

    renderKit()

    expect(screen.getByRole('heading', { name: 'Elegí el mate' })).toBeVisible()
    const steps = screen.getByRole('navigation', { name: 'Pasos del kit' })
    expect(within(steps).getByText('Faltan 3')).toBeVisible()
  })
})

describe('KitBuilder: descuento y datos', () => {
  it('usa el descuento de los ajustes en el panel y en el aviso', () => {
    renderKit(CATALOG, 20)
    buildFullKit()

    const panel = screen.getByRole('complementary', { name: 'Resumen del kit' })
    expect(within(panel).getByText('Descuento kit −20%')).toBeVisible()
    expect(within(panel).getByText('−$15.199')).toBeVisible()
    expect(within(panel).getByText('$60.798')).toBeVisible()

    fireEvent.click(addButton())
    expect(screen.getByRole('status', { hidden: true })).toHaveTextContent(
      'Descuento de 20% aplicado',
    )
  })

  it('una pieza elegida que ya no se puede comprar vuelve a faltar', () => {
    const { rerender } = render(<KitBuilder products={CATALOG} discountPercent={10} />)
    buildFullKit()
    expect(addButton()).toBeEnabled()

    rerender(
      <KitBuilder
        products={CATALOG.map((product) =>
          product.id === 'y1' ? kitProduct({ ...product, isPurchasable: false }) : product,
        )}
        discountPercent={10}
      />,
    )

    expect(addButton()).toBeDisabled()
    expect(screen.getByText('Te falta elegir la yerba.')).toBeVisible()
  })
})
