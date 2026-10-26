// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProductTabsContent, PublicSettings } from '@galpon/api-client'
import { ProductDetailView } from './ProductDetailView'
import { ProductGallery } from './ProductGallery'
import { RelatedProducts } from './RelatedProducts'
import { detail, summary } from './test/support'

// La compra navega con el router de Next.
vi.mock('next/navigation', () => ({
  useRouter: (): { push: (href: string) => void } => ({ push: vi.fn() }),
}))

afterEach(() => {
  cleanup()
})

const settings: PublicSettings = {
  contactEmail: 'galpon.mates@gmail.com',
  installments: { maxWithoutInterest: 3, showOnProduct: true },
  kitDiscountPercent: 10,
  priceDisplay: { showNetPrice: true },
  seller: {
    address: null,
    cuit: null,
    dataFiscalUrl: null,
    legalName: null,
    phone: null,
    supportArea: null,
    supportHours: null,
    taxCondition: null,
  },
  shippingOptions: [],
}

const tabsContent: ProductTabsContent = {
  mate: {
    careTitle: 'Cuidado',
    materialsTitle: 'Materiales',
    materials: '',
    care: '',
    descriptionNote: null,
  },
  bombilla: {
    careTitle: 'Cuidado',
    materialsTitle: 'Materiales',
    materials: '',
    care: '',
    descriptionNote: null,
  },
  yerba: {
    careTitle: 'Conservación',
    materialsTitle: 'Contenido',
    materials: '',
    care: '',
    descriptionNote: null,
  },
  shipping: '',
}

const photos = [1, 2, 3].map((position) => ({
  publicId: `galpon/productos/mate-${String(position)}`,
  url: `/mock-images/mate-${String(position)}.jpg`,
  width: 960,
  height: 1280,
  alt: `Foto ${String(position)} del mate`,
}))

/** Dibuja la ficha de un producto con los ajustes de fábrica. */
function renderView(
  product = detail(),
  overrides: Partial<PublicSettings> = {},
): ReturnType<typeof userEvent.setup> {
  render(
    <ProductDetailView
      product={product}
      settings={{ ...settings, ...overrides }}
      tabsContent={tabsContent}
    />,
  )
  return userEvent.setup()
}

describe('ProductDetailView', () => {
  it('muestra migas, línea, nombre, precio, cuotas, precio sin impuestos y stock', () => {
    renderView()

    const crumbs = screen.getByRole('navigation', { name: 'Ruta de navegación' })
    expect(within(crumbs).getByRole('link', { name: 'Tienda' })).toHaveAttribute('href', '/tienda')
    expect(within(crumbs).getByRole('link', { name: 'Imperiales' })).toHaveAttribute(
      'href',
      '/tienda/imperiales',
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mate Imperial Premium')
    expect(screen.getByText('$39.999')).toBeVisible()
    expect(screen.getByText('o 3 cuotas sin interés de $13.333', { exact: false })).toBeVisible()
    expect(screen.getByText('Precio sin impuestos nacionales: $33.057')).toBeVisible()
    expect(screen.getByText('En stock · listo para despachar')).toBeVisible()
    expect(screen.getByText('N°07')).toBeVisible()
  })

  it('el promedio lleva a las reseñas y cuenta con formato argentino', () => {
    renderView(detail({ rating: { average: 4.7, count: 1234 } }))

    expect(screen.getByRole('link', { name: /1\.234 reseñas/ })).toHaveAttribute('href', '#resenas')
  })

  it('sin reseñas dice "Todavía no hay reseñas"', () => {
    renderView(detail({ rating: { average: 0, count: 0 } }))

    expect(screen.getByRole('link', { name: /Todavía no hay reseñas/ })).toBeVisible()
  })

  it('respeta los ajustes: sin precio sin impuestos ni cuotas si están apagados', () => {
    renderView(detail(), {
      priceDisplay: { showNetPrice: false },
      installments: { maxWithoutInterest: 3, showOnProduct: false },
    })

    expect(screen.queryByText(/sin impuestos nacionales/)).toBeNull()
    expect(screen.queryByText(/cuotas sin interés/)).toBeNull()
  })

  it('un producto agotado dice "Sin stock por ahora" y ofrece consultar por mail', () => {
    renderView(detail({ isSoldOut: true, isPurchasable: false, maxQuantity: 0 }))

    expect(screen.getByText('Sin stock por ahora')).toBeVisible()
    expect(screen.queryByText('En stock · listo para despachar')).toBeNull()
    expect(screen.getByRole('link', { name: 'Consultar por mail' })).toBeVisible()
  })

  it('un producto sin precio muestra "Consultar" en lugar del monto', () => {
    renderView(detail({ priceArs: null, netPriceArs: null, isPurchasable: false }))

    expect(screen.getByText('Consultar')).toBeVisible()
    expect(screen.queryByText(/cuotas sin interés/)).toBeNull()
  })

  it('las garantías muestran Cambios y Arrepentimiento por separado', () => {
    renderView()

    const guarantees = screen.getByRole('list', { name: 'Garantías de compra' })
    const items = within(guarantees).getAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(items[2]).toHaveTextContent('Cambios10 días, sin uso')
    expect(items[3]).toHaveTextContent('Arrepentimiento10 días corridos, sin causa y sin costo')
  })

  it('las pestañas muestran la descripción con su nota y cambian con el mouse y el teclado', async () => {
    const user = renderView()

    const panel = screen.getByRole('tabpanel')
    expect(panel).toHaveTextContent('Imperial con virola de alpaca. Cada pieza es artesanal.')
    expect(screen.getByRole('tab', { name: 'Descripción', selected: true })).toBeVisible()

    await user.click(screen.getByRole('tab', { name: 'Materiales' }))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Calabaza, cuero y alpaca.')

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Envío y cambios', selected: true })).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Envíos a todo el país.')

    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Cuidado', selected: true })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Descripción', selected: true })).toHaveFocus()
  })

  it('un mate lleva la banda "Completá la ronda" con el descuento y el enlace al kit', () => {
    renderView()

    expect(screen.getByText('Completá la ronda')).toBeVisible()
    expect(screen.getByText('Sumale bombilla y yerba a este mate y llevate −10%.')).toBeVisible()
    expect(screen.getByRole('link', { name: /Armar kit con este mate/ })).toHaveAttribute(
      'href',
      '/kit?mate=mate-imperial-premium',
    )
  })

  it('sin descuento del kit la banda invita a sumar sin nombrar el descuento', () => {
    renderView(detail(), { kitDiscountPercent: 0 })

    expect(screen.getByText('Sumale bombilla y yerba a este mate.')).toBeVisible()
  })

  it('una bombilla o una yerba no lleva la banda del kit', () => {
    for (const group of ['bombilla', 'yerba'] as const) {
      renderView(detail({ group, options: null }))
      expect(screen.queryByText('Completá la ronda')).toBeNull()
      cleanup()
    }
  })
})

describe('ProductGallery', () => {
  it('con varias fotos muestra contador, flechas y miniaturas, y da la vuelta', async () => {
    const user = userEvent.setup()
    render(<ProductGallery productName="Mate" code="N°07" images={photos} />)

    expect(screen.getByText('01 / 03')).toBeVisible()
    expect(screen.getByRole('img', { name: 'Foto 1 del mate' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Ver la foto 2' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Foto siguiente' }))
    expect(screen.getByText('02 / 03')).toBeVisible()
    expect(screen.getByRole('img', { name: 'Foto 2 del mate' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Ver la foto 3' }))
    expect(screen.getByText('03 / 03')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Foto siguiente' }))
    expect(screen.getByText('01 / 03')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Foto anterior' }))
    expect(screen.getByText('03 / 03')).toBeVisible()
  })

  it('con una sola foto no hay flechas ni miniaturas', () => {
    render(<ProductGallery productName="Mate" code="N°07" images={photos.slice(0, 1)} />)

    expect(screen.getByText('01 / 01')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Foto siguiente' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Ver la foto/ })).toBeNull()
  })

  it('sin fotos muestra la tarjeta punteada con "Foto 1 · nombre del producto"', () => {
    render(<ProductGallery productName="Mate Imperial Premium" code="N°07" images={[]} />)

    expect(screen.getByText('01 / 01')).toBeVisible()
    const placeholder = screen.getByRole('img', { name: 'Mate Imperial Premium' })
    expect(placeholder).toBeVisible()
    expect(placeholder).toHaveClass('border-dashed')
    expect(placeholder).toHaveTextContent('Foto 1 · Mate Imperial Premium')
  })
})

describe('RelatedProducts', () => {
  it('muestra una tarjeta por producto relacionado', () => {
    render(
      <RelatedProducts
        products={[summary({ id: 'a', name: 'Mate A' }), summary({ id: 'b', name: 'Mate B' })]}
        settings={settings}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Más para la ronda' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Mate A' })).toHaveAttribute('href', '/producto/a')
    expect(screen.getByRole('link', { name: 'Mate B' })).toHaveAttribute('href', '/producto/b')
  })

  it('sin productos no dibuja nada', () => {
    const { container } = render(<RelatedProducts products={[]} settings={settings} />)

    expect(container).toBeEmptyDOMElement()
  })
})
