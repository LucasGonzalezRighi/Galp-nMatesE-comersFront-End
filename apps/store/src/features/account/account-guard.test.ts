import { describe, expect, it } from 'vitest'
import { ApiError } from '@galpon/api-client'
import { requireAccountData } from './account-guard'

/** Error de la API de la clase indicada. */
function apiError(kind: 'unauthorized' | 'not_found' | 'server', status: number): ApiError {
  return new ApiError({ kind, status, problem: null, message: kind })
}

describe('requireAccountData', () => {
  it('devuelve los datos cuando la carga sale bien', async () => {
    await expect(requireAccountData(() => Promise.resolve(42), '/cuenta')).resolves.toBe(42)
  })

  it('sin sesión (401) redirige a ingresar con `volver`', async () => {
    await expect(
      requireAccountData(() => Promise.reject(apiError('unauthorized', 401)), '/cuenta/pedidos'),
    ).rejects.toMatchObject({
      digest: expect.stringContaining('/cuenta/ingresar?volver=%2Fcuenta%2Fpedidos') as unknown,
    })
  })

  it('con un 404 muestra la página de no encontrado', async () => {
    await expect(
      requireAccountData(() => Promise.reject(apiError('not_found', 404)), '/cuenta/pedidos'),
    ).rejects.toMatchObject({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' })
  })

  it('cualquier otro error sigue de largo (lo muestra error.tsx con reintentar)', async () => {
    const error = apiError('server', 500)
    await expect(requireAccountData(() => Promise.reject(error), '/cuenta')).rejects.toBe(error)
  })

  it('rechaza una ruta de regreso que no es interna', async () => {
    await expect(
      requireAccountData(() => Promise.resolve(1), 'https://evil.example'),
    ).rejects.toThrow(RangeError)
  })
})
