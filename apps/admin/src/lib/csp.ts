/** Origen de la API de imágenes (subida directa a Cloudinary desde el dashboard). */
const CLOUDINARY_API = 'https://api.cloudinary.com'

/** Origen de las imágenes ya publicadas en Cloudinary. */
const CLOUDINARY_IMAGES = 'https://res.cloudinary.com'

/** Devuelve el origen de una URL absoluta `http(s)`; falla si no lo es. */
function originOf(apiOrigin: string): string {
  let url: URL | null = null
  try {
    url = new URL(apiOrigin)
  } catch {
    // Se informa abajo, con el mismo mensaje que si el protocolo no es http(s).
  }
  // `;` y `,` son válidos en un host pero cortarían la directiva: se rechazan.
  if (
    url === null ||
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    /[;,\s]/.test(url.origin)
  ) {
    throw new RangeError(
      `buildAdminCsp necesita el origen de la API como URL absoluta con http o https (por ejemplo "https://api.galponmates.com.ar"), y recibió ${JSON.stringify(apiOrigin)}.`,
    )
  }
  return url.origin
}

/**
 * Arma la política de seguridad de contenido (CSP) del dashboard, la de la sección 16 del spec.
 *
 * Es estricta porque la SPA no tiene scripts inline: `script-src 'self'`, sin `'unsafe-inline'`.
 * Solo permite conectarse al propio sitio, a la API y a Cloudinary (sin comodines); no admite
 * `<object>`/`<embed>`, ni cambiar la `<base>`, ni mandar formularios a otro sitio. Se aplica en `vite preview`
 * y tiene que repetirla el servidor que sirva el dashboard (ver el README de la app).
 *
 * @param apiOrigin - Origen o URL de la API (`VITE_API_BASE_URL`), o `null` en modo de prueba.
 *   Solo se usa su origen.
 * @returns El valor de la cabecera `Content-Security-Policy`.
 * @throws {RangeError} Si `apiOrigin` no es una URL absoluta con `http` o `https`.
 */
export function buildAdminCsp(apiOrigin: string | null): string {
  const connectSources = ["'self'", ...(apiOrigin === null ? [] : [originOf(apiOrigin)])]
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${CLOUDINARY_IMAGES}`,
    `connect-src ${[...connectSources, CLOUDINARY_API].join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}

/** Cabeceras de seguridad del dashboard además de la CSP (sección 16 del spec). */
export interface AdminSecurityHeaders {
  /** Impide que el navegador adivine el tipo de un archivo distinto al declarado. */
  readonly 'X-Content-Type-Options': 'nosniff'
  /** Manda solo el origen al navegar hacia otro sitio, y nada si se baja de HTTPS a HTTP. */
  readonly 'Referrer-Policy': 'strict-origin-when-cross-origin'
  /** Apaga cámara, micrófono, ubicación y pagos del navegador, que el dashboard no usa. */
  readonly 'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
}

/**
 * Cabeceras de seguridad que acompañan a la CSP en `vite preview`.
 *
 * `Strict-Transport-Security` no va acá porque `vite preview` sirve `http://localhost`: la tiene
 * que agregar el servidor de producción (con HTTPS), como cuenta el README de la app.
 */
export const ADMIN_SECURITY_HEADERS: AdminSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
}
