/**
 * Se ejecuta una vez cuando arranca el servidor de Next.js: en Node.js valida el entorno y, si no
 * es válido, termina el proceso con los problemas a la vista; si es válido y es el servidor de
 * producción, arranca el tope de la caché de páginas en disco (ver `instrumentation-node.ts`).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startRouteCacheLimitInProduction, validateEnvOrExit } =
      await import('./instrumentation-node')
    validateEnvOrExit()
    startRouteCacheLimitInProduction()
  }
}
