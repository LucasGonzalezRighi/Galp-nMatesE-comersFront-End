import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_CUSTOMER_SESSION_COOKIE } from '@galpon/api-client/mock/session-cookie'
import type { ApiMode } from './lib/env'
import { trustedClientIp } from './lib/client-ip'
import { getStoreEnv } from './lib/env'
import { isSlugShaped } from './lib/slug'

/**
 * Cookie de sesión de la tienda según el modo (Ruling P3-2): en vivo `__Host-galpon_session`; en
 * modo de prueba la del mock, sin el prefijo `__Host-`, que el navegador no acepta en
 * `http://localhost`.
 */
const SESSION_COOKIE: Readonly<Record<ApiMode, string>> = {
  mock: DEFAULT_CUSTOMER_SESSION_COOKIE,
  live: '__Host-galpon_session',
}

/** Páginas de acceso de clientes: se abren sin sesión. */
const PUBLIC_ACCOUNT_PATHS = new Set([
  '/cuenta/ingresar',
  '/cuenta/registro',
  '/cuenta/recuperar',
  '/cuenta/restablecer',
])

/** Cabeceras de reenvío que puede inventar el cliente: no pasan al backend. */
const CLIENT_FORWARDING_HEADERS = ['x-forwarded-for', 'x-real-ip', 'forwarded'] as const

/** `/api/v1` y lo que cuelga de ahí. */
const API_PATH = /^\/api\/v1(?:\/|$)/

/** Una ficha (`/producto/{slug}`) o una línea (`/tienda/{linea}`): la sección y el slug crudo. */
const CATALOG_PATH = /^\/(producto|tienda)\/([^/]+)$/

/**
 * Slug al que se reescribe una ficha o una línea con un slug imposible: no tiene la forma de uno
 * del contrato, así que la página responde su 404 ("No encontramos ese producto.") sin consultar
 * la API, y todas las direcciones inventadas comparten esa única página en vez de guardar una cada
 * una. Es también el relleno de las líneas cuando no hay ninguna (`CATALOG_PLACEHOLDER_LINE`).
 */
export const NOT_FOUND_SLUG = '_'

/**
 * `/api/v1/*` (el rewrite hacia el backend o la API simulada): borra `x-forwarded-for`,
 * `x-real-ip` y `forwarded` que mande el cliente, que podría inventarlos para saltear los límites
 * por IP del backend. Con `TRUSTED_CLIENT_IP_HEADER` pone `x-forwarded-for` con el valor de esa
 * cabecera, la que escribe el proxy de la plataforma con la IP real; el backend la lee si confía en
 * el servidor de la tienda (`TRUST_PROXY`).
 */
function forwardToApi(request: NextRequest, trustedClientIpHeader: string | null): NextResponse {
  // Se lee antes de borrar: la cabecera de confianza puede ser una de las que se borran.
  const clientIp = trustedClientIp(request.headers, trustedClientIpHeader)
  const headers = new Headers(request.headers)
  for (const name of CLIENT_FORWARDING_HEADERS) headers.delete(name)
  if (clientIp !== null) headers.set('x-forwarded-for', clientIp)
  return NextResponse.next({ request: { headers } })
}

/**
 * Protege el área del cliente (`/cuenta`, pedidos y direcciones; spec 9.1): sin la cookie de
 * sesión redirige a `/cuenta/ingresar?volver=` con la ruta pedida. Solo mira que la cookie
 * exista; si la sesión venció o es anónima, la página lo resuelve con la API (`401` → ingresar).
 * Todas las páginas de la cuenta salen con `Cache-Control: no-store`: después de cerrar sesión,
 * "Atrás" no muestra los datos de la cuenta desde el caché ni desde el bfcache.
 */
function guardAccount(request: NextRequest, apiMode: ApiMode): NextResponse {
  const { pathname, search } = request.nextUrl
  const session = request.cookies.get(SESSION_COOKIE[apiMode])?.value ?? ''
  let response: NextResponse
  if (PUBLIC_ACCOUNT_PATHS.has(pathname.replace(/\/+$/, '')) || session !== '') {
    response = NextResponse.next()
  } else {
    const login = new URL('/cuenta/ingresar', request.url)
    login.searchParams.set('volver', `${pathname}${search}`)
    response = NextResponse.redirect(login)
  }
  response.headers.set('Cache-Control', 'no-store')
  return response
}

/**
 * Proxy de la tienda:
 *
 * - `/api/v1/*`: limpia las cabeceras de reenvío del cliente (ver {@link forwardToApi}).
 * - `/producto/{slug}` y `/tienda/{linea}`: un slug que no tiene la forma de uno del contrato
 *   (mayúsculas, `%`, más de 80 caracteres) va a la 404 de su sección (`/producto/_` o
 *   `/tienda/_`, ver {@link NOT_FOUND_SLUG}): una sola página para todas, sin consultar la API.
 * - `/cuenta/*`: pide la cookie de sesión (ver {@link guardAccount}).
 *
 * @param request - Pedido entrante.
 * @returns Seguir (con las cabeceras del pedido limpias en la API), la 404 o la redirección a
 *   ingresar.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  const env = getStoreEnv()
  if (API_PATH.test(pathname)) return forwardToApi(request, env.trustedClientIpHeader)
  const [, section, slug] = CATALOG_PATH.exec(pathname) ?? []
  if (section !== undefined && slug !== undefined) {
    return isSlugShaped(slug)
      ? NextResponse.next()
      : NextResponse.rewrite(new URL(`/${section}/${NOT_FOUND_SLUG}`, request.url))
  }
  return guardAccount(request, env.apiMode)
}

/** El proxy corre en `/cuenta` y sus páginas, en la API y en las fichas y las líneas. */
export const config = {
  matcher: ['/cuenta', '/cuenta/:path*', '/api/v1/:path*', '/producto/:slug', '/tienda/:linea'],
}
