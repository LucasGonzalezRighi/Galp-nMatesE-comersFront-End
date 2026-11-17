/** Secreto de los controles cuando no se define `MOCK_CONTROL_SECRET`: sirve solo para estas pruebas. */
const DEFAULT_E2E_SECRET = 'e2e-controles-del-modo-de-prueba-2026'

/**
 * Secreto de los controles de escenarios de la API simulada (`MOCK_CONTROL_SECRET`) en las pruebas
 * de punta a punta: la tienda compilada corre en producción, donde los controles solo responden
 * con él. `playwright.config.ts` se lo pasa a la tienda que levanta; con una tienda ya levantada,
 * hay que arrancarla con el mismo valor (o definir `MOCK_CONTROL_SECRET` para las dos).
 */
export const E2E_MOCK_CONTROL_SECRET = secretFromEnv() ?? DEFAULT_E2E_SECRET

/** `MOCK_CONTROL_SECRET` sin espacios en los bordes, o `undefined` si falta o está vacía. */
function secretFromEnv(): string | undefined {
  const value = process.env.MOCK_CONTROL_SECRET?.trim()
  return value === '' ? undefined : value
}

/** Cabeceras de los pedidos a los controles de escenarios (`/api/v1/__mock/…`). */
export const MOCK_CONTROL_HEADERS: Readonly<Record<string, string>> = {
  'x-mock-control-secret': E2E_MOCK_CONTROL_SECRET,
}
