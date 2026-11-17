import { EnvError, getStoreEnv } from './lib/env'

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
