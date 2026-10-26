import type { ApiClient } from '@galpon/api-client'
import { readCsrfToken } from '@/features/account'
import { createApiClient } from '@galpon/api-client'
import { DEFAULT_SITE_URL, parseHttpOrigin } from './env'

/** Prefijo de versión de la API: el navegador siempre habla con `/api/v1` de su propio dominio. */
const API_PATH = '/api/v1'

let browserApi: ApiClient | undefined

/**
 * Dirección base de la API para el cliente del navegador, siempre con `/api/v1`: en el navegador
 * es el origen de la página (así no hay CORS y la cookie es propia); en el servidor, que no tiene
 * `window`, el origen público de la tienda.
 *
 * @param siteUrl - Origen público de la tienda (`NEXT_PUBLIC_SITE_URL`); se usa solo en el servidor.
 * @throws {RangeError} Si `siteUrl` no es un origen `http` o `https`.
 */
export function resolveBrowserBaseUrl(siteUrl: string): string {
  const origin = parseHttpOrigin(siteUrl)
  if (origin === null) {
    throw new RangeError(
      `siteUrl tiene que ser un origen http(s) sin ruta (por ejemplo "https://galponmates.com.ar"), y recibió ${JSON.stringify(siteUrl)}`,
    )
  }
  return `${typeof window === 'undefined' ? origin : window.location.origin}${API_PATH}`
}

/**
 * Cliente de la API para los Client Components. Habla con `/api/v1` del mismo dominio: en modo de
 * prueba un *rewrite* lo lleva a la API simulada y en vivo al backend. Manda las cookies propias
 * (`credentials: 'same-origin'`) y, en las escrituras, el token anti-CSRF de la sesión que guarda
 * la cuenta de cliente (`readCsrfToken`).
 */
export function getBrowserApi(): ApiClient {
  // Next.js reemplaza este acceso literal por el valor de la variable al compilar.
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  browserApi ??= createApiClient({
    baseUrl: resolveBrowserBaseUrl(
      configuredSiteUrl === undefined || configuredSiteUrl === ''
        ? DEFAULT_SITE_URL
        : configuredSiteUrl,
    ),
    credentials: 'same-origin',
    getCsrfToken: readCsrfToken,
  })
  return browserApi
}
