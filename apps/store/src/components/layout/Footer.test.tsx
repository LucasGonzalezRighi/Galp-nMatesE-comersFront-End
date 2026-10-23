// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Category, FooterContent, PublicSettings } from '@galpon/api-client'
import { FooterView, formatCuit, sellerLines } from './FooterView'

afterEach(cleanup)

const content: FooterContent = {
  tagline: 'Hechos para compartir.',
  text: 'Mates, bombillones y yerba con envío a todo el país.',
  paymentMethods: ['Mercado Pago', 'Visa', 'Mastercard', 'American Express'],
  consumerDefenseUrl: null,
}

const emptySeller: PublicSettings['seller'] = {
  address: null,
  cuit: null,
  dataFiscalUrl: null,
  legalName: null,
  phone: null,
  supportArea: null,
  supportHours: null,
  taxCondition: null,
}

const settings: PublicSettings = {
  contactEmail: 'galpon.mates@gmail.com',
  installments: { maxWithoutInterest: 3, showOnProduct: true },
  kitDiscountPercent: 10,
  priceDisplay: { showNetPrice: true },
  seller: emptySeller,
  shippingOptions: [],
}

const categories: Category[] = [
  {
    id: 'cat-imperiales',
    slug: 'imperiales',
    name: 'Imperiales',
    group: 'mate',
    blurb: '',
    image: null,
    position: 1,
    productCount: 4,
  },
  {
    id: 'cat-yerbas',
    slug: 'yerbas',
    name: 'Yerbas',
    group: 'yerba',
    blurb: '',
    image: null,
    position: 2,
    productCount: 3,
  },
]

describe('FooterView', () => {
  it('muestra la frase, la bajada y el mail de contacto', () => {
    render(<FooterView content={content} settings={settings} categories={categories} />)

    expect(screen.getByText('Hechos para compartir.')).toBeVisible()
    expect(screen.getByText('Mates, bombillones y yerba con envío a todo el país.')).toBeVisible()
    expect(screen.getByRole('link', { name: 'galpon.mates@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:galpon.mates@gmail.com',
    )
  })

  it('las columnas llevan a las líneas, la ayuda, el sitio y los legales', () => {
    render(<FooterView content={content} settings={settings} categories={categories} />)

    const shop = screen.getByRole('navigation', { name: 'Tienda' })
    expect(within(shop).getByRole('link', { name: 'Imperiales' })).toHaveAttribute(
      'href',
      '/tienda/imperiales',
    )
    expect(within(shop).getByRole('link', { name: 'Yerbas' })).toHaveAttribute(
      'href',
      '/tienda/yerbas',
    )
    const help = screen.getByRole('navigation', { name: 'Ayuda' })
    expect(within(help).getByRole('link', { name: 'Envíos' })).toHaveAttribute(
      'href',
      '/preguntas-frecuentes#envios',
    )
    expect(within(help).getByRole('link', { name: 'Botón de arrepentimiento' })).toHaveAttribute(
      'href',
      '/arrepentimiento',
    )
    const site = screen.getByRole('navigation', { name: 'Galpón' })
    expect(within(site).getByRole('link', { name: 'Armá tu kit' })).toHaveAttribute('href', '/kit')
    const legal = screen.getByRole('navigation', { name: 'Legales' })
    expect(within(legal).getByRole('link', { name: 'Términos y condiciones' })).toHaveAttribute(
      'href',
      '/terminos',
    )
    expect(within(legal).getByRole('link', { name: 'Política de privacidad' })).toHaveAttribute(
      'href',
      '/privacidad',
    )
  })

  it('el link de Defensa del Consumidor aparece solo si hay dirección y abre afuera', () => {
    const { rerender } = render(
      <FooterView content={content} settings={settings} categories={categories} />,
    )
    expect(screen.queryByRole('link', { name: 'Defensa del consumidor' })).toBeNull()

    rerender(
      <FooterView
        content={{
          ...content,
          consumerDefenseUrl: 'https://www.argentina.gob.ar/defensadelconsumidor',
        }}
        settings={settings}
        categories={categories}
      />,
    )

    const link = screen.getByRole('link', { name: 'Defensa del consumidor' })
    expect(link).toHaveAttribute('href', 'https://www.argentina.gob.ar/defensadelconsumidor')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('muestra el año actual (calculado en el cliente), la marca y los medios de pago', () => {
    render(<FooterView content={content} settings={settings} categories={categories} />)

    expect(
      screen.getByText(`© ${String(new Date().getFullYear())} Galpón Mates`, { exact: false }),
    ).toBeVisible()
    expect(screen.getByText('Pagás con')).toBeVisible()
    for (const method of content.paymentMethods) expect(screen.getByText(method)).toBeVisible()
  })

  it('sin datos del vendedor no dibuja ese bloque', () => {
    render(<FooterView content={content} settings={settings} categories={categories} />)

    expect(screen.queryByText(/CUIT/)).toBeNull()
    expect(screen.queryByRole('link', { name: 'Data Fiscal (ARCA)' })).toBeNull()
  })

  it('con datos del vendedor muestra los que hay y el link a Data Fiscal', () => {
    render(
      <FooterView
        content={content}
        settings={{
          ...settings,
          seller: {
            ...emptySeller,
            legalName: 'Galpón Mates S. R. L.',
            cuit: '30712345671',
            taxCondition: 'Responsable inscripto',
            address: 'Av. Siempreviva 742, Neuquén',
            supportHours: 'Lunes a viernes de 9 a 18',
            dataFiscalUrl: 'https://example.com/data-fiscal',
          },
        }}
        categories={categories}
      />,
    )

    expect(
      screen.getByText('Galpón Mates S. R. L. · CUIT 30-71234567-1 · Responsable inscripto'),
    ).toBeVisible()
    expect(screen.getByText('Av. Siempreviva 742, Neuquén')).toBeVisible()
    expect(screen.getByText('Lunes a viernes de 9 a 18')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Data Fiscal (ARCA)' })).toHaveAttribute(
      'href',
      'https://example.com/data-fiscal',
    )
  })
})

describe('formatCuit y sellerLines', () => {
  it('formatCuit pone los guiones solo a 11 dígitos', () => {
    expect(formatCuit('30712345671')).toBe('30-71234567-1')
    expect(formatCuit('123')).toBe('123')
  })

  it('sellerLines arma una línea por grupo y deja afuera lo que falta', () => {
    expect(sellerLines(emptySeller)).toEqual([])
    expect(
      sellerLines({
        ...emptySeller,
        phone: '+54 9 299 123 4567',
        supportArea: 'Atención al cliente',
      }),
    ).toEqual(['+54 9 299 123 4567', 'Atención al cliente'])
  })
})
