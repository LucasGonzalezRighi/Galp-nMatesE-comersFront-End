// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductSummary } from '@galpon/api-client'
import { addKitToCart, clearCart, useCart } from '../cart'
import { hideToast, Toaster } from '../toast'
import { ProductCard } from './ProductCard'

/** Navegación simulada: la tarjeta lleva a la ficha con el router de Next. */
const router = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: (): { push: (href: string) => void } => router,
}))

const installments = { maxWithoutInterest: 3, showOnProduct: true }

/** Muestra las líneas del carrito (por la API pública de la feature, como cualquier pantalla). */
function CartProbe(): ReactNode {
  return <pre data-testid="cart-lines">{JSON.stringify(useCart().lines)}</pre>
}

/** Las líneas del carrito que muestra `CartProbe`. */
function cartLines(): unknown {
  return JSON.parse(screen.getByTestId('cart-lines').textContent)
}

/** Producto para las pruebas: un mate de 10.000 pesos con stock 10, salvo lo que se cambie. */
function summary(overrides: Partial<ProductSummary> & { id: string }): ProductSummary {
  return {
    categoryId: 'cat-imperiales',
    categoryName: 'Imperiales',
    categorySlug: 'imperiales',
    code: 'N°01',
    description: 'Descripción.',
    featured: false,
    group: 'mate',
    isPurchasable: true,
    isSoldOut: false,
    mainImage: null,
    maxQuantity: 10,
    name: `Producto ${overrides.id}`,
    netPriceArs: 8264,
    priceArs: 10000,
    rating: { average: 0, count: 0 },
    slug: overrides.id,
    ...overrides,
  }
}

/** Dibuja una tarjeta con los ajustes de fábrica (cuotas y precio sin impuestos), el aviso y el carrito. */
function renderCard(product: ProductSummary, props: { showNetPrice?: boolean } = {}): void {
  render(
    <>
      <ProductCard
        product={product}
        installments={installments}
        showNetPrice={props.showNetPrice ?? true}
      />
      <Toaster />
      <CartProbe />
    </>,
  )
}

const mate = summary({
  id: 'prd-imperial-premium',
  slug: 'mate-imperial-premium',
  name: 'Mate Imperial Premium',
  categoryName: 'Imperiales',
  priceArs: 39999,
  netPriceArs: 33057,
  maxQuantity: 12,
  rating: { average: 4.7, count: 3 },
  mainImage: {
    url: '/mock-images/mate-imperial-premium.jpg',
    alt: 'Mate Imperial Premium con virola de alpaca',
    width: 960,
    height: 1280,
    publicId: 'galpon/productos/mate-imperial-premium',
  },
})

beforeEach(() => {
  router.push.mockReset()
  act(() => {
    clearCart()
  })
})

afterEach(() => {
  act(() => {
    hideToast()
  })
  cleanup()
})

describe('ProductCard', () => {
  it('muestra línea, nombre, promedio, precio, cuotas con CFT y precio sin impuestos', () => {
    renderCard(mate)

    expect(screen.getByText('Imperiales')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Mate Imperial Premium' })).toHaveAttribute(
      'href',
      '/producto/mate-imperial-premium',
    )
    expect(screen.getByText('4,7')).toBeVisible()
    expect(screen.getByText('$39.999')).toBeVisible()
    expect(screen.getByText('o 3 cuotas sin interés de $13.333', { exact: false })).toBeVisible()
    expect(screen.getByText('CFT 0,00 %')).toBeVisible()
    expect(screen.getByText('Precio sin impuestos nacionales: $33.057')).toBeVisible()
    expect(screen.getByText('Ver detalle')).toBeInTheDocument()
    // La foto entra con un fundido al terminar de cargar (jsdom no la descarga: se avisa a mano).
    const photo = screen.getByRole('img', { name: 'Mate Imperial Premium con virola de alpaca' })
    fireEvent.load(photo)
    expect(photo).toBeVisible()
    expect(screen.queryByText('Sin stock')).toBeNull()
    expect(screen.queryByText('Consultar')).toBeNull()
  })

  it('sin reseñas no muestra estrella ni promedio', () => {
    renderCard({ ...mate, rating: { average: 0, count: 0 } })

    expect(screen.queryByText('Puntuación')).toBeNull()
    expect(screen.queryByText('0,0')).toBeNull()
  })

  it('respeta los ajustes: sin cuotas ni precio sin impuestos si están apagados', () => {
    render(
      <ProductCard
        product={mate}
        installments={{ maxWithoutInterest: 3, showOnProduct: false }}
        showNetPrice={false}
      />,
    )

    expect(screen.queryByText(/cuotas/)).toBeNull()
    expect(screen.queryByText(/sin impuestos nacionales/)).toBeNull()
  })

  it('sin precio: etiqueta y precio "Consultar", "Precio a confirmar" y no se puede agregar', () => {
    renderCard({ ...mate, priceArs: null, netPriceArs: null, isPurchasable: false })

    // La etiqueta sobre la foto y el precio.
    expect(screen.getAllByText('Consultar')).toHaveLength(2)
    expect(screen.getByText('Precio a confirmar')).toBeVisible()
    expect(screen.queryByText(/cuotas/)).toBeNull()
    expect(screen.queryByText(/sin impuestos nacionales/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Agregar al carrito' })).toBeDisabled()
  })

  it('sin stock: etiqueta "Sin stock" y el botón de agregar deshabilitado', async () => {
    renderCard({ ...mate, isSoldOut: true, isPurchasable: false, maxQuantity: 0 })

    expect(screen.getByText('Sin stock')).toBeVisible()
    const add = screen.getByRole('button', { name: 'Agregar al carrito' })
    expect(add).toBeDisabled()
    await userEvent.click(add)
    expect(cartLines()).toEqual([])
  })

  it('sin foto muestra la tarjeta punteada con el ícono y el nombre del producto', () => {
    renderCard({ ...mate, mainImage: null })

    const placeholder = screen.getByRole('img', { name: 'Mate Imperial Premium' })
    expect(placeholder.tagName).toBe('DIV')
    expect(placeholder).toHaveClass('border-dashed')
    expect(placeholder.querySelector('svg')).toBeInTheDocument()
    expect(placeholder).toHaveTextContent('Mate Imperial Premium')
  })

  it('agregar rápido suma el mate con Negro y Alpaca cincelada y avisa "Agregado al carrito"', async () => {
    renderCard(mate)

    await userEvent.click(screen.getByRole('button', { name: 'Agregar al carrito' }))

    expect(cartLines()).toEqual([
      {
        type: 'product',
        productId: 'prd-imperial-premium',
        quantity: 1,
        options: { leather: 'Negro', ferrule: 'Alpaca cincelada' },
      },
    ])
    expect(screen.getByRole('status')).toHaveTextContent(
      'Agregado al carrito. Mate Imperial Premium',
    )
    // Agregar no navega a la ficha.
    expect(router.push).not.toHaveBeenCalled()
  })

  it('una bombilla se agrega sin opciones', async () => {
    renderCard(summary({ id: 'b1', group: 'bombilla', name: 'Bombillón', priceArs: 25999 }))

    await userEvent.click(screen.getByRole('button', { name: 'Agregar al carrito' }))

    expect(cartLines()).toEqual([{ type: 'product', productId: 'b1', quantity: 1 }])
  })

  it('un doble clic rápido nunca supera el tope y deja el botón deshabilitado', async () => {
    renderCard({ ...mate, maxQuantity: 1 })
    const add = screen.getByRole('button', { name: 'Agregar al carrito' })

    await userEvent.dblClick(add)

    expect(cartLines()).toEqual([
      expect.objectContaining({ productId: 'prd-imperial-premium', quantity: 1 }),
    ])
    expect(add).toBeDisabled()
    expect(add).toHaveAttribute('title', 'Ya tenés el máximo disponible en el carrito')
  })

  it('cuenta lo que ya hay en el carrito, también dentro de un kit', () => {
    const limited = { ...mate, maxQuantity: 2 }
    renderCard(limited)

    act(() => {
      for (let kit = 0; kit < 2; kit += 1) {
        addKitToCart({
          pieces: {
            mate: limited,
            bombilla: summary({ id: 'b', group: 'bombilla', name: 'Bombilla' }),
            yerba: summary({ id: 'y', group: 'yerba', name: 'Yerba' }),
          },
          leather: 'Negro',
          discountPercent: 10,
        })
      }
    })

    expect(screen.getByRole('button', { name: 'Agregar al carrito' })).toBeDisabled()
  })

  it('tocar la tarjeta lleva a la ficha una sola vez', async () => {
    renderCard(mate)

    await userEvent.click(screen.getByText('Imperiales'))

    expect(router.push).toHaveBeenCalledExactlyOnceWith('/producto/mate-imperial-premium')
  })

  it('el enlace del nombre no navega dos veces', async () => {
    renderCard(mate)
    // En captura: el nombre frena la propagación del clic, y jsdom no implementa la navegación.
    document.addEventListener(
      'click',
      (event) => {
        event.preventDefault()
      },
      { once: true, capture: true },
    )

    await userEvent.click(screen.getByRole('link', { name: 'Mate Imperial Premium' }))

    expect(router.push).not.toHaveBeenCalled()
  })
})

describe('ProductCard: hover y foco', () => {
  /** El contenedor que agrupa el hover de la tarjeta. */
  function cardGroup(): HTMLElement {
    const element = document.querySelector<HTMLElement>('[data-product-card]')
    if (element === null) throw new Error('Falta la tarjeta.')
    return element
  }

  it('al pasar el mouse (o con el foco adentro) la tarjeta sube 4 px y la foto se acerca a 1,04', () => {
    renderCard(mate)

    expect(cardGroup()).toHaveClass('group/card')
    const article = cardGroup().querySelector('article')
    expect(article).toHaveClass(
      'motion-safe:group-hover/card:-translate-y-1',
      'motion-safe:group-has-focus-visible/card:-translate-y-1',
    )
    const zoom = cardGroup().querySelector('[data-card-zoom]')
    expect(zoom).toHaveClass(
      'duration-600',
      'ease-main',
      'motion-safe:group-hover/card:scale-[1.04]',
      'motion-safe:group-has-focus-visible/card:scale-[1.04]',
    )
  })

  it('el nombre subraya desde la izquierda y la foto entra con un fundido', () => {
    renderCard(mate)

    expect(screen.getByRole('link', { name: 'Mate Imperial Premium' })).toHaveClass(
      'after:origin-left',
      'after:scale-x-0',
      'group-hover/card:after:scale-x-100',
      'group-has-focus-visible/card:after:scale-x-100',
    )
    expect(cardGroup().querySelector('[data-fade-image] img')).not.toBeNull()
  })

  it('el "+" se llena de gris con el ícono que gira 90° y la píldora "Ver detalle" también', () => {
    renderCard(mate)

    const add = screen.getByRole('button', { name: 'Agregar al carrito' })
    expect(add).toHaveClass('[--btn-fill:var(--color-neutral-600)]')
    expect(add.querySelector('[data-button-sweep]')).toHaveClass(
      'group-hover/card:[clip-path:inset(0)]',
    )
    expect(add.querySelector('svg')).toHaveClass('motion-safe:group-hover/card:rotate-90')
    const pill = screen.getByText('Ver detalle')
    expect(pill.querySelector('[data-button-sweep]')).toHaveClass('bg-neutral-600')
  })
})
