import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { DEFAULT_CUSTOMER_SESSION_COOKIE } from '@galpon/api-client/mock'
import type { ApiMode } from './lib/env'
import { getStoreEnv } from './lib/env'

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

/**
 * Protege el área del cliente (`/cuenta`, pedidos y direcciones; spec 9.1): sin la cookie de
 * sesión redirige a `/cuenta/ingresar?volver=` con la ruta pedida. Solo mira que la cookie
 * exista; si la sesión venció o es anónima, la página lo resuelve con la API (`401` → ingresar).
 *
 * @param request - Pedido entrante.
 * @returns Seguir con la página, o la redirección a ingresar.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl
  if (PUBLIC_ACCOUNT_PATHS.has(pathname.replace(/\/+$/, ''))) return NextResponse.next()
  const session = request.cookies.get(SESSION_COOKIE[getStoreEnv().apiMode])?.value ?? ''
  if (session !== '') return NextResponse.next()
  const login = new URL('/cuenta/ingresar', request.url)
  login.searchParams.set('volver', `${pathname}${search}`)
  return NextResponse.redirect(login)
}

/** El proxy corre solo en `/cuenta` y sus páginas. */
export const config = {
  matcher: ['/cuenta', '/cuenta/:path*'],
}
