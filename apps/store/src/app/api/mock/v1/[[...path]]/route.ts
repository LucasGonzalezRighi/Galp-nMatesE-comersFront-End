import { getStoreEnv } from '@/lib/env'
import { getStoreMockFetch } from '@/lib/mock.server'

/**
 * La API simulada, para el navegador: `/api/v1/*` se reescribe acá en modo de prueba. Delega en
 * el mismo `fetch` simulado que usan los Server Components, así ven los mismos datos. En vivo
 * responde 404. Se usa `[[...path]]` para que también atienda `/api/mock/v1` sin segmentos.
 */
function handle(request: Request): Promise<Response> {
  if (getStoreEnv().apiMode !== 'mock') {
    return Promise.resolve(
      Response.json(
        {
          type: 'not_found',
          title: 'No existe',
          status: 404,
          detail: 'La API simulada solo existe con API_MODE=mock.',
        },
        { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
      ),
    )
  }
  return getStoreMockFetch()(request)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
