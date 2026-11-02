import { EnvError, getStoreEnv } from './lib/env'

/**
 * Valida el entorno de la tienda. Si no es válido, imprime los problemas y termina el proceso, así
 * no atiende pedidos con una configuración incoherente. Vive aparte de `instrumentation.ts` porque
 * usa APIs de Node.js que el runtime Edge no tiene.
 */
export function validateEnvOrExit(): void {
  try {
    getStoreEnv()
  } catch (error) {
    const message = error instanceof EnvError ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exit(1)
  }
}
