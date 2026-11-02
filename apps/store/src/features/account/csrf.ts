import type { QueryClient } from '@tanstack/react-query'
import type { ApiClient } from '@galpon/api-client'
import { isApiError } from '@galpon/api-client'
import { customerCsrfQuery, queryKeys } from '@galpon/api-client/react'

/** Token anti-CSRF de la sesión actual, el que manda el cliente del navegador. */
let currentToken: string | undefined

/**
 * Token anti-CSRF vigente de la tienda, o `undefined` si todavía no se pidió. Es el
 * `getCsrfToken` del cliente de la API del navegador: va en `X-CSRF-Token` en cada escritura.
 */
export function readCsrfToken(): string | undefined {
  return currentToken
}

/** Trae el token (del caché, o de la API con `fresh`) y lo deja como vigente. */
async function loadToken(queryClient: QueryClient, api: ApiClient, fresh: boolean): Promise<void> {
  const { csrfToken } = await queryClient.query({
    ...customerCsrfQuery(api),
    // El token dura lo que la sesión: solo se vuelve a pedir si la API lo rechaza o si cambia la
    // sesión (resetAccountState lo borra).
    staleTime: fresh ? 0 : Infinity,
    // Es parte de un envío: sin red se avisa enseguida en el formulario, sin esperar reintentos.
    retry: false,
  })
  currentToken = csrfToken
}

/**
 * Corre una escritura de la cuenta con el token anti-CSRF de la sesión: lo pide si hace falta y,
 * si la API lo rechaza (`403`, por ejemplo porque otra pestaña inició o cerró sesión), pide uno
 * nuevo y reintenta una sola vez.
 *
 * @param queryClient - Cliente de TanStack Query, donde se guarda el token.
 * @param api - Cliente de la API (el del navegador manda {@link readCsrfToken}).
 * @param action - La escritura.
 * @returns Lo que devuelve la escritura.
 * @throws {ApiError} Si falla el pedido del token o la escritura (salvo el primer `403`).
 */
export async function withCsrf<T>(
  queryClient: QueryClient,
  api: ApiClient,
  action: () => Promise<T>,
): Promise<T> {
  await loadToken(queryClient, api, false)
  try {
    return await action()
  } catch (error) {
    if (!isApiError(error) || error.kind !== 'forbidden') throw error
    await loadToken(queryClient, api, true)
    return action()
  }
}

/**
 * Olvida el token y los datos de la cuenta después de iniciar o cerrar sesión, crear la cuenta o
 * cambiar la contraseña: la API rota la cookie y el token, y los datos son de otra sesión. Las
 * consultas en pantalla (por ejemplo, la sesión del encabezado) se vuelven a pedir.
 *
 * @param queryClient - Cliente de TanStack Query.
 */
export async function resetAccountState(queryClient: QueryClient): Promise<void> {
  currentToken = undefined
  await queryClient.resetQueries({ queryKey: queryKeys.account() })
}
