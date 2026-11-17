import type { ApiFetch } from '../client'

/** Un `fetch` con su frasco de cookies, como un navegador. */
export interface CookieJarFetch {
  /** Manda las cookies guardadas en cada pedido y guarda (o borra) las que pone la respuesta. */
  fetch: ApiFetch
  /** Cookies guardadas, por nombre. */
  cookies: Map<string, string>
}

/**
 * Envuelve un `fetch` con un frasco de cookies: cada pedido lleva las cookies guardadas y cada
 * `Set-Cookie` de la respuesta las actualiza (`Max-Age=0` la borra).
 *
 * @param inner - El `fetch` que atiende los pedidos (en los tests, el de la API simulada).
 */
export function withCookieJar(inner: ApiFetch): CookieJarFetch {
  const cookies = new Map<string, string>()
  const fetch: ApiFetch = async (request) => {
    if (cookies.size > 0) {
      request.headers.set(
        'Cookie',
        [...cookies].map(([name, value]) => `${name}=${value}`).join('; '),
      )
    }
    const response = await inner(request)
    for (const header of response.headers.getSetCookie()) {
      const [pair = ''] = header.split(';')
      const [name = '', value = ''] = pair.split('=')
      if (/max-age=0/i.test(header)) cookies.delete(name)
      else cookies.set(name, value)
    }
    return response
  }
  return { fetch, cookies }
}
