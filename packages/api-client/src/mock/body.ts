import { problem, ResponseError } from './http'

/**
 * Tope del cuerpo de un pedido a la API simulada: 64 kB. En la tienda la API simulada corre en el
 * mismo proceso que arma las páginas, así que un cuerpo más grande no llega a leerse entero.
 */
export const MAX_MOCK_BODY_BYTES = 64 * 1024

/**
 * Tope de las rutas que exigen la sesión del admin antes de leer el cuerpo y guardan textos largos
 * o fotos: los `PUT` de contenido (el FAQ entero y cada documento legal pasan de 64 kB) y
 * `POST /__mock/media` (un data URL de hasta 200 000 caracteres). 4 MB.
 */
export const MAX_MOCK_ADMIN_BODY_BYTES = 4 * 1024 * 1024

/** Error `413` de un cuerpo que pasa el tope. */
function tooLarge(limit: number): ResponseError {
  return new ResponseError(
    problem(413, 'El cuerpo es demasiado grande', {
      detail: `El cuerpo del pedido pasa los ${String(limit / 1024)} kB.`,
    }),
  )
}

/** Lee el cuerpo como texto sin pasar de `limit` bytes. */
async function readText(request: Request, limit: number): Promise<string> {
  // El tipo dice que `body` siempre existe, pero Firefox no lo tiene: se mira al ejecutar. Ahí el
  // pedido es del dashboard, que corre la API simulada en su propio navegador, y se lee entero.
  const stream = (request as Partial<Pick<Request, 'body'>>).body
  if (stream === undefined) {
    const text = await request.text()
    if (new TextEncoder().encode(text).byteLength > limit) throw tooLarge(limit)
    return text
  }
  if (stream === null) return ''
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let size = 0
  let text = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) return text + decoder.decode()
    size += value.byteLength
    if (size > limit) {
      await reader.cancel()
      throw tooLarge(limit)
    }
    text += decoder.decode(value, { stream: true })
  }
}

/**
 * Lee el cuerpo de un pedido como JSON sin pasar de `limit` bytes: si `Content-Length` ya lo pasa
 * corta sin leerlo y, si no viene (un cuerpo en pedazos), corta en cuanto lo leído lo pasa.
 *
 * @param request - Pedido a la API simulada.
 * @param limit - Tope en bytes ({@link MAX_MOCK_BODY_BYTES} o el de la ruta).
 * @returns El cuerpo interpretado como JSON.
 * @throws {ResponseError} Con `413` si pasa el tope y con `422` si no es un JSON válido.
 */
export async function readJsonBody(request: Request, limit: number): Promise<unknown> {
  const declared = Number(request.headers.get('Content-Length') ?? '0')
  if (declared > limit) throw tooLarge(limit)
  const text = await readText(request, limit)
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new ResponseError(
      problem(422, 'Los datos no son válidos', {
        detail: 'El cuerpo del pedido no es un JSON válido.',
      }),
    )
  }
}
