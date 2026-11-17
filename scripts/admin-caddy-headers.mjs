// Escribe en la salida estándar el bloque `header` de Caddy con las cabeceras de seguridad del
// dashboard: la CSP de `buildAdminCsp` y las de `ADMIN_SECURITY_HEADERS` (`apps/admin/src/lib/csp.ts`).
// Lo corre `apps/admin/Dockerfile` al construir la imagen, así el servidor de producción manda
// exactamente las mismas cabeceras que `vite preview`.
//
// Uso: node scripts/admin-caddy-headers.mjs https://api.tudominio.com.ar > cabeceras.caddy
import { ADMIN_SECURITY_HEADERS, buildAdminCsp } from '../apps/admin/src/lib/csp.ts'

/**
 * Arma el bloque `header { … }` de un Caddyfile con la CSP y las cabeceras de seguridad del
 * dashboard.
 *
 * @param {string} apiOrigin - Origen del back (`VITE_API_BASE_URL`), con `http` o `https`.
 * @returns {string} El bloque, terminado en salto de línea.
 * @throws {RangeError} Si `apiOrigin` no es una URL absoluta con `http` o `https`, o si algún valor
 *   trae comillas dobles o saltos de línea (romperían el Caddyfile).
 */
export function adminCaddyHeaders(apiOrigin) {
  const headers = {
    'Content-Security-Policy': buildAdminCsp(apiOrigin),
    ...ADMIN_SECURITY_HEADERS,
  }
  const lines = Object.entries(headers).map(([name, value]) => {
    if (/["\r\n\\]/.test(value)) {
      throw new RangeError(`La cabecera ${name} tiene caracteres que rompen el Caddyfile.`)
    }
    return `\t${name} "${value}"`
  })
  return `header {\n${lines.join('\n')}\n}\n`
}

// Solo al correrlo como comando (no al importarlo desde un test).
if (process.argv[1] !== undefined && import.meta.filename === process.argv[1]) {
  const apiOrigin = process.argv[2]
  if (apiOrigin === undefined || apiOrigin === '') {
    process.stderr.write('Uso: node scripts/admin-caddy-headers.mjs <origen del back>\n')
    process.exit(1)
  }
  process.stdout.write(adminCaddyHeaders(apiOrigin))
}
