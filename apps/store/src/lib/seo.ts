import type { Metadata, MetadataRoute } from 'next'
import { tokens } from '@galpon/design-tokens'

/** Nombre de la tienda en los metadatos, los datos para compartir y el manifiesto. */
export const SITE_NAME = 'Galpón Mates'

/** Descripción por omisión de la tienda (la del layout) para las páginas que no tienen una propia. */
export const SITE_DESCRIPTION = 'Mates, bombillones y yerba con envío a todo el país.'

/** Idioma de los datos para compartir (formato Open Graph). */
const OPEN_GRAPH_LOCALE = 'es_AR'

/**
 * Imagen para compartir por omisión (`app/opengraph-image.png`). Se declara a mano en cada página
 * porque el `openGraph` de una página reemplaza al del layout, imagen incluida; Next la vuelve
 * absoluta con el `metadataBase` del layout.
 */
export const DEFAULT_OG_IMAGE = {
  url: '/opengraph-image.png',
  width: 1200,
  height: 630,
  alt: 'Galpón Mates: mates, bombillones y yerba.',
} as const

/**
 * Rutas de las páginas informativas y de servicio que se listan en el sitemap, además del inicio,
 * la tienda, las líneas y los productos.
 */
export const INFO_PAGE_PATHS = [
  '/kit',
  '/nosotros',
  '/preguntas-frecuentes',
  '/contacto',
  '/arrepentimiento',
  '/terminos',
  '/privacidad',
] as const

/** Rutas que los buscadores no tienen que recorrer: la API y las páginas privadas del cliente. */
const DISALLOWED_PATHS = ['/api/', '/checkout', '/cuenta', '/pedido']

/** Lado, en píxeles, del ícono grande de la aplicación (`app/icon.png`). */
const ICON_SIZE = '512x512'

/** Entrada del sitemap sin la dirección: con qué frecuencia cambia la página y su peso relativo. */
interface SitemapWeight {
  /** Frecuencia de cambio que se informa a los buscadores. */
  changeFrequency: 'daily' | 'monthly' | 'weekly'
  /** Prioridad relativa dentro del sitio, de 0 a 1. */
  priority: number
}

/** Datos de {@link buildPageMetadata}. */
export interface PageMetadataInput {
  /** Título de la página; el layout agrega la plantilla "· Galpón Mates". */
  title: string
  /** Descripción para los buscadores y para compartir. */
  description: string
  /** Ruta interna de la página, por ejemplo `/nosotros`; de ahí sale la dirección canónica. */
  path: string
  /** Origen público de la tienda, sin barra final (`NEXT_PUBLIC_SITE_URL`). */
  siteUrl: string
  /** Si es `true`, pide a los buscadores no indexar la página (por ejemplo, las de un pedido). */
  noIndex?: boolean
}

/** Datos de {@link buildSitemapEntries}. */
export interface SitemapInput {
  /** Origen público de la tienda, sin barra final. */
  siteUrl: string
  /** Slugs de las líneas de producto del listado. */
  lineSlugs: readonly string[]
  /** Slugs de los productos publicados. */
  productSlugs: readonly string[]
}

/**
 * Arma la dirección absoluta de una ruta de la tienda.
 *
 * @param siteUrl - Origen público de la tienda; una barra final se ignora.
 * @param path - Ruta interna: empieza con `/` y no con `//`.
 * @returns Por ejemplo `https://galponmates.com.ar/tienda`.
 * @throws {RangeError} Si el origen está vacío o la ruta no es interna.
 * @example
 * absoluteSiteUrl('https://galponmates.com.ar', '/tienda')
 */
export function absoluteSiteUrl(siteUrl: string, path: string): string {
  if (siteUrl.trim() === '') throw new RangeError('siteUrl no puede estar vacío.')
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new RangeError(
      `La ruta tiene que ser interna: empezar con "/" y no con "//"; se recibió ${JSON.stringify(path)}.`,
    )
  }
  return `${siteUrl.replace(/\/+$/, '')}${path}`
}

/**
 * Metadatos de una página de la tienda: título, descripción, dirección canónica y datos para
 * compartir (Open Graph y Twitter) con la imagen por omisión de la tienda ({@link DEFAULT_OG_IMAGE}).
 *
 * @param input - Ver {@link PageMetadataInput}.
 * @returns Los metadatos de Next.js.
 * @throws {RangeError} Si el título o la descripción están vacíos, el origen está vacío o la ruta no es interna.
 * @example
 * export const metadata = buildPageMetadata({ title: 'Nosotros', description: '…', path: '/nosotros', siteUrl })
 */
export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const { title, description, path, siteUrl, noIndex = false } = input
  if (title.trim() === '') throw new RangeError('El título no puede estar vacío.')
  if (description.trim() === '') throw new RangeError('La descripción no puede estar vacía.')
  const url = absoluteSiteUrl(siteUrl, path)
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: SITE_NAME,
      locale: OPEN_GRAPH_LOCALE,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: { card: 'summary_large_image', title, description, images: [DEFAULT_OG_IMAGE.url] },
    ...(noIndex ? { robots: { index: false, follow: false } } : null),
  }
}

/** Una entrada del sitemap con su dirección absoluta. */
function sitemapEntry(
  siteUrl: string,
  path: string,
  weight: SitemapWeight,
): MetadataRoute.Sitemap[number] {
  return { url: absoluteSiteUrl(siteUrl, path), ...weight }
}

/**
 * Entradas del sitemap: inicio, tienda, las líneas, los productos publicados y las páginas
 * informativas. Los slugs se codifican y no se repite ninguna dirección.
 *
 * @param input - Ver {@link SitemapInput}.
 * @returns La lista para `app/sitemap.ts`.
 * @throws {RangeError} Si el origen está vacío.
 */
export function buildSitemapEntries(input: SitemapInput): MetadataRoute.Sitemap {
  const { siteUrl, lineSlugs, productSlugs } = input
  const entries = [
    sitemapEntry(siteUrl, '/', { changeFrequency: 'weekly', priority: 1 }),
    sitemapEntry(siteUrl, '/tienda', { changeFrequency: 'daily', priority: 0.9 }),
    ...lineSlugs.map((slug) =>
      sitemapEntry(siteUrl, `/tienda/${encodeURIComponent(slug)}`, {
        changeFrequency: 'daily',
        priority: 0.8,
      }),
    ),
    ...productSlugs.map((slug) =>
      sitemapEntry(siteUrl, `/producto/${encodeURIComponent(slug)}`, {
        changeFrequency: 'weekly',
        priority: 0.7,
      }),
    ),
    ...INFO_PAGE_PATHS.map((path) =>
      sitemapEntry(siteUrl, path, { changeFrequency: 'monthly', priority: 0.5 }),
    ),
  ]
  const seen = new Set<string>()
  return entries.filter((entry) => {
    if (seen.has(entry.url)) return false
    seen.add(entry.url)
    return true
  })
}

/**
 * Reglas de `robots.txt`: todo el sitio abierto salvo la API y las páginas privadas, con el
 * sitemap y el host.
 *
 * @param siteUrl - Origen público de la tienda, sin barra final.
 * @throws {RangeError} Si el origen está vacío.
 */
export function buildRobots(siteUrl: string): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: DISALLOWED_PATHS },
    sitemap: absoluteSiteUrl(siteUrl, '/sitemap.xml'),
    host: siteUrl.replace(/\/+$/, ''),
  }
}

/**
 * Manifiesto de la aplicación web: nombre, colores del diseño e ícono (el `app/icon.png`, con
 * margen suficiente para usarse también como ícono adaptable).
 */
export function buildManifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: 'Galpón',
    description: SITE_DESCRIPTION,
    lang: 'es-AR',
    start_url: '/',
    display: 'standalone',
    background_color: tokens.colors.background,
    theme_color: tokens.colors.background,
    icons: [
      { src: '/icon.png', sizes: ICON_SIZE, type: 'image/png' },
      { src: '/icon.png', sizes: ICON_SIZE, type: 'image/png', purpose: 'maskable' },
    ],
  }
}
