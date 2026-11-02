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
  const mercadoPago = 'https://*.mercadopago.com'
  const mercadoLibre = 'https://*.mercadolibre.com'
  const mlstatic = 'https://*.mlstatic.com'
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
    `img-src 'self' data: blob: https://res.cloudinary.com ${mlstatic} ${mercadoPago}`,
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
