import { notFound, redirect } from 'next/navigation'
import { asRoute } from '@/lib/routes'
import { isApiError } from '@galpon/api-client'
import { loginPath } from './return-path'

/**
 * Carga los datos de una página del área del cliente en el servidor y resuelve los casos de la
 * spec 9.7: sin sesión (`401`) redirige a ingresar con `volver`; un pedido que no existe o es de
 * otro cliente (`404`) muestra la página de no encontrado. Cualquier otro error sigue de largo
 * hasta `error.tsx`, que ofrece reintentar.
 *
 * @param load - Lecturas de la página, con el cliente de `getServerApiForRequest`.
 * @param returnPath - Ruta de la página, para volver después de ingresar.
 * @returns Los datos.
 * @throws {RangeError} Si `returnPath` no es una ruta interna.
 */
export async function requireAccountData<T>(
  load: () => Promise<T>,
  returnPath: string,
): Promise<T> {
  const login = asRoute(loginPath(returnPath))
  try {
    return await load()
  } catch (error) {
    if (isApiError(error) && error.kind === 'unauthorized') redirect(login)
    if (isApiError(error) && error.kind === 'not_found') notFound()
    throw error
  }
}
