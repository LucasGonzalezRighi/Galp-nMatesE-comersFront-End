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
 * Solo permite conectarse al propio sitio, a la API y a Cloudinary. Se aplica en `vite preview`
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
    "frame-ancestors 'none'",
  ].join('; ')
}
