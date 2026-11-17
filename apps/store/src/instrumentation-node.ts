import { join } from 'node:path'
import { EnvError, getStoreEnv } from './lib/env'
import { ROUTE_CACHE_SUBPATH, startRouteCacheLimit } from './lib/route-cache-limit'

/** Aviso del arranque cuando un servidor de producción corre con la API simulada. */
export const MOCK_IN_PRODUCTION_WARNING =
  'Aviso: la tienda corre en producción con la API simulada (API_MODE=mock y MOCK_ALLOWED_IN_PRODUCTION=true). Es inseguro: la API simulada no tiene autenticación real y todos los que la visitan comparten una sola base. Su admin solo abre con MOCK_ADMIN_PASSWORD y sus controles de escenarios solo con MOCK_CONTROL_SECRET. Usalo solo para pruebas, nunca en un sitio público.'

/**
 * Valida el entorno de la tienda. Si no es válido, imprime los problemas y termina el proceso, así
 * no atiende pedidos con una configuración incoherente. Si es un servidor de producción con la API
 * simulada (permitido solo con `MOCK_ALLOWED_IN_PRODUCTION=true`), avisa en el log que es
 * inseguro. Vive aparte de `instrumentation.ts` porque usa APIs de Node.js que el runtime Edge no
 * tiene.
 */
export function validateEnvOrExit(): void {
  try {
    if (getStoreEnv().mockInProduction) process.stderr.write(`${MOCK_IN_PRODUCTION_WARNING}\n`)
  } catch (error) {
    const message = error instanceof EnvError ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exit(1)
  }
}

/**
 * Arranca el tope de la caché de páginas en disco (pista 13; ver `lib/route-cache-limit.ts`) con el
 * tope de `ROUTE_CACHE_MAX_MB`. Solo en el servidor de producción (`next start`): `next dev` guarda
 * su caché en otra carpeta y `next build` no sirve pedidos.
 *
 * @returns `true` si lo arrancó.
 */
export function startRouteCacheLimitInProduction(): boolean {
  if (
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PHASE === 'phase-production-build'
  ) {
    return false
  }
  startRouteCacheLimit({
    directory: join(process.cwd(), '.next', ROUTE_CACHE_SUBPATH),
    maxBytes: getStoreEnv().routeCacheMaxBytes,
  })
  return true
}
