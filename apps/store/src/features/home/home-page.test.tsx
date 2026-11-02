// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HomeData } from './home-data'
import {
  cleanUpAfterEach,
  installIntersectionObserver,
  mockReducedMotion,
} from '../../components/motion/test/support'
import { buildHomeData } from './home-data'
import { HomeKit } from './HomeKit'
import { HomeManifesto } from './HomeManifesto'
import { HomePage } from './HomePage'
import { HomeReviews } from './HomeReviews'
import { HomeStats } from './HomeStats'
import { loadFixtureCatalog } from './test/fixture-catalog'

/** Navegación simulada: las tarjetas de producto llevan a la ficha con el router de Next. */
vi.mock('next/navigation', () => ({
  useRouter: (): { push: (href: string) => void } => ({ push: vi.fn() }),
}))

/** La lectura del servidor se reemplaza por los datos del catálogo de fábrica. */
vi.mock('./home.data', async () => {
  const { buildHomeData: build } = await import('./home-data')
  const { loadFixtureCatalog: load } = await import('./test/fixture-catalog')
  const data = build(await load())
  return { getHomeData: (): Promise<HomeData> => Promise.resolve(data) }
})

cleanUpAfterEach()

beforeEach(() => {
  // Con movimiento reducido todo aparece sin esperar a una animación: lo que se prueba es el contenido.
  mockReducedMotion(true)
  installIntersectionObserver()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
})

/** Datos del inicio con el catálogo de fábrica y los cambios que pida cada prueba. */
async function homeData(change?: (data: HomeData) => HomeData): Promise<HomeData> {
  const data = buildHomeData(await loadFixtureCatalog())
  return change === undefined ? data : change(data)
}

/** Dibuja una sección del inicio. */
function renderSection(element: ReactNode): ReturnType<typeof render> {
  return render(element)
}

describe('HomePage', () => {
  it('dibuja las secciones del inicio en el orden del spec', async () => {
    renderSection(await HomePage())
    const text = document.body.textContent
    const order = [
      'Encontrá', // portada
      'Alpaca', // historia: la bombilla y el agua
      'Seis líneas para cada ronda', // colección
      'Los más elegidos de la ronda', // destacados
      'Un mate no se compra', // manifiesto
      'Piezas en catálogo', // cifras
      '−10% en el kit.', // kit
      'Lo que dice la ronda', // reseñas
    ].map((fragment) => text.indexOf(fragment))
    expect(order.every((position) => position >= 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('tiene un solo título principal y es "Encontrá tu mate."', async () => {
    renderSection(await HomePage())
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent(/Encontrá.*tu mate\./)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    // En la portada del servidor cada línea del título entra con CSS.
    expect(heading.querySelectorAll('.home-rise')).toHaveLength(2)
  })

  it('no tiene rótulos chicos ni números de orden visibles (Ruling MR-23)', async () => {
    const data = await homeData()
    renderSection(await HomePage())
    const { collection, featured, reviews, manifesto, kitBlock, scenes } = data.content
    const eyebrows = [
      collection.eyebrow,
      featured.eyebrow,
      reviews.eyebrow,
      manifesto.eyebrow,
      kitBlock.eyebrow,
      // Las escenas que el inicio dibuja con su cuerpo: el bombillón y el ritual.
      ...scenes
        .filter((scene) => scene.key === 'bombilla' || scene.key === 'ritual')
        .map((scene) => scene.eyebrow),
    ]
    // Los links y botones con el mismo texto ("Armá tu kit") no son rótulos.
    for (const eyebrow of eyebrows) {
      expect(screen.queryByText(eyebrow, { ignore: 'script, style, a, button' })).toBeNull()
    }
    // Ni el 01, 02… de las tarjetas, el kit y los pasos del agua, ni el "01 — 06" de la colección.
    expect(screen.queryAllByText(/^0\d$/)).toHaveLength(0)
    // Los títulos grandes quedan.
    expect(screen.getByRole('heading', { level: 2, name: collection.title })).toBeInTheDocument()
  })

  it('la portada tiene de fondo el cuadro del mate, sin la foto flotante del producto', async () => {
    const data = await homeData()
    renderSection(await HomePage())
    const hero = document.querySelector<HTMLElement>('.home-hero')
    const images = Array.from(hero?.querySelectorAll('img') ?? [])
    const sources = images.map((image) => decodeURIComponent(image.getAttribute('src') ?? ''))
    expect(sources.some((source) => source.includes('/hero/world/pieces.jpg'))).toBe(true)
    // El cuadro es decorativo y la foto del mate de la portada (`StoryVisual`) ya no está.
    expect(images.every((image) => image.getAttribute('alt') === '')).toBe(true)
    const productPhoto = data.story.hero?.mainImage?.url ?? '(sin foto)'
    expect(sources.some((source) => source.includes(productPhoto))).toBe(false)
    // Con menos movimiento no caen hojas ni sube vapor.
    expect(hero?.querySelector('[data-world-life]')).toBeNull()
  })

  it('la portada lleva a la tienda y al kit, con el descuento del kit', async () => {
    renderSection(await HomePage())
    expect(screen.getByRole('link', { name: 'Ver la tienda' })).toHaveAttribute('href', '/tienda')
    const kitLink = screen.getAllByRole('link', { name: /Armá tu kit/ })[0]
    expect(kitLink).toHaveAttribute('href', '/kit')
    expect(kitLink).toHaveTextContent('−10%')
  })

  it('las líneas sin foto dibujan el marco punteado con "Foto · nombre de la línea"', async () => {
    renderSection(await HomePage())
    expect(screen.getByText('Foto · Torpedos')).toBeInTheDocument()
  })

  it('los destacados usan la tarjeta de producto y las escenas ofrecen agregar al carrito', async () => {
    const data = await homeData()
    renderSection(await HomePage())
    expect(screen.getAllByText('Ver detalle')).toHaveLength(data.featured.length)
    const storyList = screen.getAllByRole('list', { name: 'Productos de la escena' })
    expect(storyList.length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getAllByRole('button', { name: /^Agregar .+ al carrito$/ }).length,
    ).toBeGreaterThan(0)
  })
})

describe('HomeManifesto', () => {
  it('muestra la frase y el link a Nosotros (sin rótulo), por encima del fondo', async () => {
    const data = await homeData()
    const { container } = renderSection(<HomeManifesto data={data} />)
    const section = container.querySelector('section')
    expect(section).toHaveClass('home-manifesto', 'relative')
    expect(section).not.toHaveTextContent(data.content.manifesto.eyebrow)
    expect(section).toHaveTextContent(data.content.manifesto.text)
    const link = screen.getByRole('link', { name: data.content.manifesto.ctaLabel })
    expect(link).toHaveAttribute('href', '/nosotros')
    expect(link.closest('.z-10')).not.toBeNull()
    // La frase a la izquierda y el link a la derecha, alineados abajo (al último renglón): desde
    // 1280 px los dos en la misma celda de una grilla; más angosto, envuelve.
    const row = link.parentElement
    expect(row).toHaveClass('flex', 'items-end', 'justify-between', 'xl:grid', 'xl:grid-cols-1')
    expect(row?.firstElementChild).toHaveTextContent(data.content.manifesto.text)
    expect(row?.firstElementChild).toHaveClass('xl:col-start-1', 'xl:row-start-1')
    expect(link).toHaveClass(
      'xl:col-start-1',
      'xl:row-start-1',
      'xl:self-end',
      'xl:justify-self-end',
    )
  })

  it('en el inicio, la foto del yerbal (decorativa) cubre el Manifiesto y la banda de cifras', async () => {
    renderSection(await HomePage())
    const section = document.querySelector('section.home-manifesto')
    const block = section?.closest('[data-manifesto-block]')
    expect(block).not.toBeNull()
    const photo = block?.querySelector('img')
    expect(decodeURIComponent(photo?.getAttribute('src') ?? '')).toContain('/hero/world/yerbal.jpg')
    expect(photo).toHaveAttribute('alt', '')
    expect(photo?.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(block?.querySelector('[data-manifesto-veil]')).not.toBeNull()
    expect(block).toHaveTextContent('Piezas en catálogo')
    // El kit va después, fuera del bloque (en escritorio sube por encima).
    expect(block).not.toHaveTextContent('−10% en el kit.')
  })
})

describe('HomeStats', () => {
  it('muestra las piezas y las líneas del catálogo y las provincias y los socios del contenido', async () => {
    const data = await homeData()
    renderSection(<HomeStats data={data} />)
    expect(screen.getByText('Piezas en catálogo').previousElementSibling).toHaveTextContent('27')
    expect(screen.getByText('Líneas de producto').previousElementSibling).toHaveTextContent('6')
    expect(screen.getByText('Provincias con envío').previousElementSibling).toHaveTextContent('24')
    expect(
      screen.getByText('Socios detrás de cada pedido').previousElementSibling,
    ).toHaveTextContent('2')
  })
})

describe('HomeKit', () => {
  it('muestra el descuento en el título y en el resumen, y las opciones comprables de cada paso', async () => {
    const data = await homeData()
    renderSection(<HomeKit data={data} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Mate, bombilla y yerba. −10% en el kit.',
    )
    const summary = screen.getByText('= Kit ronda completa').parentElement
    expect(summary).toHaveTextContent('−10%')
    expect(screen.getByText('Armar mi kit').closest('a')).toHaveAttribute('href', '/kit')
    const { mate, bombilla, yerba } = data.stats.kitOptions
    // Sin foto el marco punteado repite el nombre del paso (como el diseño); el título es el `span`.
    const stepTitle = (name: string): HTMLElement => screen.getByText(name, { selector: 'span' })
    expect(stepTitle('Mate').parentElement).toHaveTextContent(`${String(mate)} opciones`)
    expect(stepTitle('Bombilla').parentElement).toHaveTextContent(`${String(bombilla)} opciones`)
    expect(stepTitle('Yerba').parentElement).toHaveTextContent(`${String(yerba)} opciones`)
  })

  it('sin descuento en el kit no muestra ningún "−N%"', async () => {
    const data = await homeData((base) => ({ ...base, kitDiscountLabel: null }))
    renderSection(<HomeKit data={data} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      /^Mate, bombilla y yerba\.$/,
    )
    expect(screen.queryByText(/−/)).toBeNull()
    expect(screen.getByText('= Kit ronda completa')).toBeInTheDocument()
  })
})

describe('HomeReviews', () => {
  it('muestra las reseñas destacadas con su texto entre comillas y el producto, que lleva a la ficha', async () => {
    const data = await homeData()
    renderSection(<HomeReviews data={data} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Lo que dice la ronda')
    const [first] = data.reviews
    if (first === undefined) throw new Error('El catálogo de fábrica no tiene reseñas destacadas.')
    expect(screen.getByText(`“${first.text}”`)).toBeInTheDocument()
    const link = screen.getAllByRole('link', { name: first.product.name })[0]
    expect(link).toHaveAttribute('href', `/producto/${first.product.slug}`)
    expect(screen.getAllByRole('link')).toHaveLength(data.reviews.length)
    const card = link?.parentElement
    if (card === null || card === undefined) throw new Error('Falta la tarjeta de la reseña.')
    expect(within(card).getByText(first.authorName)).toBeInTheDocument()
  })

  it('sin reseñas destacadas no dibuja la sección', async () => {
    const data = await homeData((base) => ({ ...base, reviews: [] }))
    const { container } = renderSection(<HomeReviews data={data} />)
    expect(container).toBeEmptyDOMElement()
  })
})
