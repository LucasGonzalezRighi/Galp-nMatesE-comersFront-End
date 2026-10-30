// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Category, FooterContent, PublicSettings } from '@galpon/api-client'
import { mockReducedMotion } from '../motion/test/support'
import {
  registerFooterStage,
  WORD_STRIPS_NARROW,
  WORD_STRIPS_WIDE,
  wordStripClip,
} from './footer-rise'
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

describe('FooterView: la palabra GALPÓN', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia')
  })

  it('dibuja la palabra con dos capas superpuestas, la fantasma y la iluminada, decorativas', () => {
    const { container } = render(
      <FooterView content={content} settings={settings} categories={categories} />,
    )

    const ghost = container.querySelector('[data-wordmark-layer="ghost"]')
    const lit = container.querySelector('[data-wordmark-layer="lit"]')
    expect(ghost).not.toBeNull()
    expect(lit).not.toBeNull()
    expect(lit?.parentElement).toBe(ghost?.parentElement)
    expect(lit?.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('con menos movimiento la iluminada queda quieta y entera, sin recorte', () => {
    mockReducedMotion(true)
    const { container } = render(
      <FooterView content={content} settings={settings} categories={categories} />,
    )

    const lit = container.querySelector('[data-wordmark-layer="lit"]')
    expect(lit?.getAttribute('style') ?? '').not.toMatch(/clip-path|transform/)
    expect(lit?.parentElement?.getAttribute('style') ?? '').not.toMatch(/transform/)
    // Una sola palabra entera, sin franjas.
    expect(container.querySelector('[data-wordmark-strip]')).toBeNull()
  })

  it('el pie lleva la clase con que sube por encima del inicio (ver footer.css)', () => {
    const { container } = render(
      <FooterView content={content} settings={settings} categories={categories} />,
    )

    expect(container.querySelector('footer')).toHaveClass('site-footer')
  })

  it('entre los medios de pago y la palabra quedan 64 px: la bombilla del logo no toca "Visa"', () => {
    const { container } = render(
      <FooterView content={content} settings={settings} categories={categories} />,
    )

    const frame = container.querySelector('[data-wordmark]')
    expect(frame).toHaveClass('mt-16')
    expect(frame?.className).not.toMatch(/mt-\[clamp\(-/)
  })

  it.each([false, true])(
    'la página termina en la mitad de las letras: el marco recorta la palabra (Ruling MR-21; menos movimiento: %s)',
    (reduced) => {
      mockReducedMotion(reduced)
      const { container } = render(
        <FooterView content={content} settings={settings} categories={categories} />,
      )

      // El logo mide 1447 × 279 y sus letras van de 72 a 266: el marco mide hasta la mitad (169).
      const frame = container.querySelector('[data-wordmark]')
      expect(frame).toHaveClass('aspect-[1447/169]', 'overflow-hidden')
      const word = frame?.querySelector('[data-wordmark-word]')
      expect(word?.parentElement).toBe(frame)
      expect(word?.querySelector('[data-wordmark-layer="lit"]')).not.toBeNull()
      // Nada debajo de la palabra: el pie (y la página) terminan en el borde del marco.
      expect(frame?.nextElementSibling).toBeNull()
      expect(container.querySelector('footer')?.className).not.toMatch(/\bpb-/)
    },
  )
})

/** Lo que el navegador simulado responde a las consultas de medios. */
interface MediaState {
  /** Si el usuario pidió menos movimiento. */
  reduced: boolean
  /** Si la ventana mide 1024 px o más. */
  wide: boolean
}

/** Simula `window.matchMedia` con la preferencia de movimiento y el ancho de la ventana. */
function mockMedia({ reduced, wide }: MediaState): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches:
        (query.includes('prefers-reduced-motion') && reduced) ||
        (query.includes('min-width: 1024px') && wide),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
}

/** Las filas que entran en cascada, en el orden de la página. */
function rows(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-footer-row]'))
}

/** Las franjas verticales de la palabra GALPÓN, de izquierda a derecha. */
function wordStrips(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-wordmark-strip]'))
}

describe('FooterView: el pie que sube por encima de las reseñas', () => {
  let unregister: (() => void) | null = null

  afterEach(() => {
    unregister?.()
    unregister = null
    Reflect.deleteProperty(window, 'matchMedia')
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    document.documentElement.style.removeProperty('--footer-h')
  })

  it('publica su alto en --footer-h mientras está montado', () => {
    const observers: (() => void)[] = []
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          observers.push(callback)
        }
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      },
    )
    const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(640)
    const { unmount } = render(
      <FooterView content={content} settings={settings} categories={categories} />,
    )

    const root = document.documentElement
    expect(root.style.getPropertyValue('--footer-h')).toBe('640px')
    height.mockReturnValue(700)
    for (const notify of observers) notify()
    expect(root.style.getPropertyValue('--footer-h')).toBe('700px')
    unmount()
    expect(root.style.getPropertyValue('--footer-h')).toBe('')
  })

  it('las filas van en orden: la frase con el mail, los cuatro grupos de links y el copyright', () => {
    const { container } = render(
      <FooterView content={content} settings={settings} categories={categories} />,
    )

    const all = rows(container)
    expect(all.map((row) => row.dataset.footerRow)).toEqual(['0', '1', '1.25', '1.5', '1.75', '3'])
    expect(all[0]).toHaveTextContent(content.tagline)
    expect(all[1]).toHaveTextContent('Tienda')
    expect(all[4]).toHaveTextContent('Legales')
    expect(all[5]).toHaveTextContent('Galpón Mates')
    expect(all[5]).toHaveTextContent('Visa')
    // La línea en diagonal de arriba es decorativa.
    expect(container.querySelector('.site-footer-line')).toHaveAttribute('aria-hidden', 'true')
  })

  it('con los datos del vendedor, su bloque es la fila 2', () => {
    const { container } = render(
      <FooterView
        content={content}
        settings={{ ...settings, seller: { ...emptySeller, legalName: 'Galpón SRL' } }}
        categories={categories}
      />,
    )

    const seller = rows(container).find((row) => row.dataset.footerRow === '2')
    expect(seller).toHaveTextContent('Galpón SRL')
  })

  it('sin reseñas quietas (las demás páginas) las filas y la palabra quedan como siempre', () => {
    mockMedia({ reduced: false, wide: true })
    const { container } = render(
      <FooterView content={content} settings={settings} categories={categories} />,
    )

    for (const row of rows(container)) expect(row).not.toHaveAttribute('style')
    // La palabra son 20 franjas que suben en ola mientras entra: antes de entrar, abajo y apagadas.
    const strips = wordStrips(container)
    expect(strips).toHaveLength(WORD_STRIPS_WIDE)
    for (const strip of strips) {
      expect(strip.style.transform).toMatch(/translateY\(70%\)/)
      expect(strip.style.opacity).toBe('0')
    }
  })

  it('sobre las reseñas quietas las filas esperan borrosas y abajo, y GALPÓN más abajo y apagada', () => {
    mockMedia({ reduced: false, wide: true })
    unregister = registerFooterStage()
    const { container } = render(
      <FooterView content={content} settings={settings} categories={categories} />,
    )

    for (const row of rows(container)) {
      expect(row.style.opacity).toBe('0')
      expect(row.style.transform).toMatch(/translateY\(28px\)/)
      expect(row.style.filter).toBe('blur(6px)')
    }
    // La palabra espera en sus 20 franjas: abajo, apagadas y con la luz recortada del todo.
    const strips = wordStrips(container)
    expect(strips).toHaveLength(WORD_STRIPS_WIDE)
    for (const strip of strips) {
      expect(strip.style.transform).toMatch(/translateY\(70%\)/)
      expect(strip.style.opacity).toBe('0')
      const lit = strip.querySelector<HTMLElement>('[data-wordmark-layer="lit"]')
      expect(lit?.style.clipPath).toBe('inset(100% 0 0 0)')
    }
  })

  it('las franjas son la misma palabra recortada de izquierda a derecha, decorativa en conjunto', () => {
    mockMedia({ reduced: false, wide: true })
    unregister = registerFooterStage()
    const { container } = render(
      <FooterView content={content} settings={settings} categories={categories} />,
    )

    const strips = wordStrips(container)
    expect(strips.map((strip) => strip.dataset.wordmarkStrip)).toEqual(
      Array.from({ length: WORD_STRIPS_WIDE }, (_, index) => String(index)),
    )
    // La primera da el alto del marco y las demás van encima, todas con su tajada de la palabra.
    expect(strips[0]).toHaveClass('relative')
    for (const [index, strip] of strips.entries()) {
      if (index > 0) expect(strip).toHaveClass('absolute', 'inset-0')
      expect(strip.style.clipPath).toBe(wordStripClip(index, WORD_STRIPS_WIDE))
      expect(strip.querySelectorAll('[data-wordmark-layer]')).toHaveLength(2)
    }
    // Una sola cosa decorativa: el marco entero oculto y ninguna etiqueta accesible adentro.
    const frame = container.querySelector('[data-wordmark]')
    expect(frame).toHaveAttribute('aria-hidden', 'true')
    expect(frame?.querySelector('[aria-label], [role]')).toBeNull()
  })

  it('sin movimiento: filas a la vista y la palabra iluminada y quieta, sin franjas', () => {
    mockMedia({ reduced: true, wide: true })
    unregister = registerFooterStage()
    const { container } = render(
      <FooterView content={content} settings={settings} categories={categories} />,
    )

    for (const row of rows(container)) expect(row).not.toHaveAttribute('style')
    const lit = container.querySelector('[data-wordmark-layer="lit"]')
    expect(lit).not.toHaveAttribute('style')
    expect(lit?.parentElement).not.toHaveAttribute('style')
    expect(wordStrips(container)).toHaveLength(0)
  })

  it('en el celular: filas a la vista y la palabra sube en ola con 12 franjas', () => {
    mockMedia({ reduced: false, wide: false })
    unregister = registerFooterStage()
    const { container } = render(
      <FooterView content={content} settings={settings} categories={categories} />,
    )

    for (const row of rows(container)) expect(row).not.toHaveAttribute('style')
    const strips = wordStrips(container)
    expect(strips).toHaveLength(WORD_STRIPS_NARROW)
    expect(strips.map((strip) => strip.style.clipPath)).toEqual(
      Array.from({ length: WORD_STRIPS_NARROW }, (_, index) =>
        wordStripClip(index, WORD_STRIPS_NARROW),
      ),
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
