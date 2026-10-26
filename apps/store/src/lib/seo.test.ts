import { describe, expect, it } from 'vitest'
import {
  absoluteSiteUrl,
  buildManifest,
  buildPageMetadata,
  buildRobots,
  buildSitemapEntries,
  INFO_PAGE_PATHS,
} from './seo'

const SITE = 'https://galponmates.com.ar'

describe('absoluteSiteUrl', () => {
  it('une el origen con la ruta', () => {
    expect(absoluteSiteUrl(SITE, '/tienda')).toBe('https://galponmates.com.ar/tienda')
    expect(absoluteSiteUrl(SITE, '/')).toBe('https://galponmates.com.ar/')
  })

  it('no duplica la barra si el origen termina en una', () => {
    expect(absoluteSiteUrl(`${SITE}/`, '/tienda')).toBe('https://galponmates.com.ar/tienda')
  })

  it.each([[''], ['tienda'], ['//otro.com'], ['https://otro.com']])(
    'rechaza la ruta %j, que no es interna',
    (path) => {
      expect(() => absoluteSiteUrl(SITE, path)).toThrow(RangeError)
    },
  )

  it('rechaza un origen vacío', () => {
    expect(() => absoluteSiteUrl('', '/tienda')).toThrow(RangeError)
  })
})

describe('buildPageMetadata', () => {
  const metadata = buildPageMetadata({
    title: 'Nosotros',
    description: 'Dos socios y un galpón.',
    path: '/nosotros',
    siteUrl: SITE,
  })

  it('lleva título, descripción y dirección canónica absoluta', () => {
    expect(metadata.title).toBe('Nosotros')
    expect(metadata.description).toBe('Dos socios y un galpón.')
    expect(metadata.alternates?.canonical).toBe('https://galponmates.com.ar/nosotros')
  })

  it('arma los datos para compartir con el nombre del sitio y el idioma', () => {
    expect(metadata.openGraph).toMatchObject({
      type: 'website',
      url: 'https://galponmates.com.ar/nosotros',
      title: 'Nosotros',
      description: 'Dos socios y un galpón.',
      siteName: 'Galpón Mates',
      locale: 'es_AR',
      images: [{ url: '/opengraph-image.png', width: 1200, height: 630 }],
    })
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'Nosotros',
      images: ['/opengraph-image.png'],
    })
  })

  it('con noIndex pide no indexar la página', () => {
    const hidden = buildPageMetadata({
      title: 'Pedido',
      description: 'Estado de un pedido.',
      path: '/pedido/GLP-1',
      siteUrl: SITE,
      noIndex: true,
    })
    expect(hidden.robots).toEqual({ index: false, follow: false })
  })

  it('sin noIndex no toca las reglas de los buscadores', () => {
    expect(metadata.robots).toBeUndefined()
  })

  it('rechaza un título o una descripción vacíos', () => {
    expect(() =>
      buildPageMetadata({ title: ' ', description: 'a', path: '/a', siteUrl: SITE }),
    ).toThrow(RangeError)
    expect(() =>
      buildPageMetadata({ title: 'a', description: '', path: '/a', siteUrl: SITE }),
    ).toThrow(RangeError)
  })
})

describe('buildSitemapEntries', () => {
  const entries = buildSitemapEntries({
    siteUrl: SITE,
    lineSlugs: ['imperiales', 'yerbas'],
    productSlugs: ['mate-imperial-premium', 'bombillon-curvo'],
  })
  const urls = entries.map((entry) => entry.url)

  it('incluye inicio, tienda, líneas, productos y páginas informativas', () => {
    expect(urls).toContain('https://galponmates.com.ar/')
    expect(urls).toContain('https://galponmates.com.ar/tienda')
    expect(urls).toContain('https://galponmates.com.ar/tienda/imperiales')
    expect(urls).toContain('https://galponmates.com.ar/tienda/yerbas')
    expect(urls).toContain('https://galponmates.com.ar/producto/mate-imperial-premium')
    expect(urls).toContain('https://galponmates.com.ar/producto/bombillon-curvo')
    for (const path of INFO_PAGE_PATHS) {
      expect(urls).toContain(`https://galponmates.com.ar${path}`)
    }
  })

  it('no repite direcciones', () => {
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('no lista páginas privadas ni de la API', () => {
    expect(urls.some((url) => /\/(api|checkout|cuenta|pedido)(\/|$)/.test(url))).toBe(false)
  })

  it('codifica los slugs en la dirección', () => {
    const odd = buildSitemapEntries({ siteUrl: SITE, lineSlugs: [], productSlugs: ['a b'] })
    expect(odd.map((entry) => entry.url)).toContain('https://galponmates.com.ar/producto/a%20b')
  })

  it('con las listas vacías igual lista las páginas fijas', () => {
    const fixed = buildSitemapEntries({ siteUrl: SITE, lineSlugs: [], productSlugs: [] })
    expect(fixed.map((entry) => entry.url)).toContain('https://galponmates.com.ar/tienda')
  })
})

describe('buildRobots', () => {
  it('permite todo, excluye lo privado y apunta al sitemap', () => {
    const robots = buildRobots(SITE)
    expect(robots.sitemap).toBe('https://galponmates.com.ar/sitemap.xml')
    expect(robots.host).toBe(SITE)
    expect(robots.rules).toEqual({
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/checkout', '/cuenta', '/pedido'],
    })
  })
})

describe('buildManifest', () => {
  const manifest = buildManifest()

  it('nombra la tienda y arranca en el inicio', () => {
    expect(manifest.name).toBe('Galpón Mates')
    expect(manifest.short_name).toBe('Galpón')
    expect(manifest.start_url).toBe('/')
    expect(manifest.display).toBe('standalone')
    expect(manifest.lang).toBe('es-AR')
  })

  it('usa los colores del diseño', () => {
    expect(manifest.background_color).toBe('#1a1210')
    expect(manifest.theme_color).toBe('#1a1210')
  })

  it('declara los íconos que genera la convención de Next', () => {
    expect(manifest.icons).toEqual([
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ])
  })
})
