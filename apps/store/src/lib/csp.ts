import { DATA_FISCAL_LOGO_ORIGIN } from '@galpon/domain'
import { parseHttpOrigin } from './env'

/** Opciones de {@link buildContentSecurityPolicy}. */
export interface ContentSecurityPolicyOptions {
  /** En desarrollo los scripts pueden usar `eval` (lo necesita React para mostrar errores). */
  isDev: boolean
  /** Origen del backend a sumar a `connect-src`, o `null` si el navegador solo habla con su propio dominio. */
  apiOrigin: string | null
  /**
   * Permite que la propia tienda embeba la página (`frame-ancestors 'self'`). Solo lo necesita el
   * simulador de Mercado Pago, que el 3-D Secure simulado abre en un iframe del mismo origen.
   * Por omisión ninguna página se puede embeber.
   */
  framedBySelf?: boolean
}

/** Mercado Pago: sus subdominios. */
const MERCADO_PAGO = 'https://*.mercadopago.com'

/** Mercado Libre (el 3-D Secure y el checkout de Mercado Pago pasan por ahí). */
const MERCADO_LIBRE = 'https://*.mercadolibre.com'

/** Los estáticos de Mercado Libre y Mercado Pago (scripts e imágenes del SDK). */
const MLSTATIC = 'https://*.mlstatic.com'

/**
 * Toda fuente con host (`https://…`) que la política de la tienda puede nombrar, sin contar el
 * origen del backend (`apiOrigin`): Mercado Pago, Cloudinary y el logo de Data Fiscal de ARCA
 * (LA-5). Las palabras clave (`'self'`, `'unsafe-inline'`) y los esquemas (`data:`, `blob:`,
 * `https:`) no cuentan. Ninguna es de analítica ni de publicidad (LS-9).
 */
export const CSP_ALLOWED_SOURCES: readonly string[] = [
  'https://sdk.mercadopago.com',
  'https://api.mercadopago.com',
  MERCADO_PAGO,
  MERCADO_LIBRE,
  MLSTATIC,
  'https://res.cloudinary.com',
  DATA_FISCAL_LOGO_ORIGIN,
]

/**
 * Hosts de analítica, publicidad y seguimiento que la tienda no usa (LS-9): la prueba de que
 * ninguna fuente de la política coincide con este patrón.
 */
export const TRACKER_HOST_PATTERN =
  /google-analytics|googletagmanager|doubleclick|googlesyndication|facebook|hotjar|clarity|segment|tiktok|linkedin/i

/** Ruta del simulador de Mercado Pago del modo de prueba; la única que la tienda puede embeber. */
export const SIMULATED_PAYMENT_PATH = '/checkout/mp-simulado'

/**
 * Arma la política de seguridad de contenido (CSP) de la tienda, según la sección 16 del spec.
 *
 * Va sin nonce para conservar el render estático, por eso los scripts permiten `'unsafe-inline'`.
 * `frame-src` incluye `'self'` porque el desafío 3-D Secure simulado del modo de prueba es una
 * página de la propia tienda (`https:` no alcanza a `http://localhost`).
 *
 * @param options - Ver {@link ContentSecurityPolicyOptions}.
 * @returns El valor de la cabecera `Content-Security-Policy`.
 * @throws {RangeError} Si `apiOrigin` no es un origen `http` o `https`.
 */
export function buildContentSecurityPolicy(options: ContentSecurityPolicyOptions): string {
  const apiOrigin = options.apiOrigin === null ? null : parseHttpOrigin(options.apiOrigin)
  if (options.apiOrigin !== null && apiOrigin === null) {
    throw new RangeError(
      `apiOrigin tiene que ser un origen http(s) sin ruta (por ejemplo "https://api.galponmates.com.ar") o null, y recibió ${JSON.stringify(options.apiOrigin)}`,
    )
  }
  const mercadoPago = MERCADO_PAGO
  const mercadoLibre = MERCADO_LIBRE
  const mlstatic = MLSTATIC
  return [
    "default-src 'self'",
    [
      "script-src 'self' 'unsafe-inline'",
      ...(options.isDev ? ["'unsafe-eval'"] : []),
      'https://sdk.mercadopago.com',
      mercadoPago,
      mlstatic,
    ].join(' '),
    "style-src 'self' 'unsafe-inline'",
    // El logo de Data Fiscal lo sirve ARCA (LA-5).
    `img-src 'self' data: blob: https://res.cloudinary.com ${mlstatic} ${mercadoPago} ${DATA_FISCAL_LOGO_ORIGIN}`,
    "font-src 'self'",
    [
      "connect-src 'self' https://api.mercadopago.com",
      mercadoPago,
      mercadoLibre,
      ...(apiOrigin === null ? [] : [apiOrigin]),
    ].join(' '),
    // El desafío 3-D Secure carga páginas del banco (cualquier origen https) o, en el modo de
    // prueba, el simulador de la propia tienda.
    `frame-src 'self' ${mercadoPago} ${mercadoLibre} https:`,
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' ${mercadoPago}`,
    options.framedBySelf === true ? "frame-ancestors 'self'" : "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
}
