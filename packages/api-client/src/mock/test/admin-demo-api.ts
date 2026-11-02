import type { MockApi } from '../../test/mock-api'
import type { MockOrder } from '../types'
import { createMockApi, loginAsAdmin } from '../../test/mock-api'
import { createMockDb, DEFAULT_MOCK_DB_OPTIONS } from '../db'

/** Momento en que arrancan los tests del admin: el mediodía del 27 de octubre en Buenos Aires. */
export const DEMO_NOW = new Date('2026-10-27T15:00:00Z')

/** API simulada del admin con los datos de demostración, la sesión iniciada y un reloj propio. */
export interface AdminDemoApi extends MockApi {
  /** Etiquetas de caché que avisó cada pedido, en orden. */
  invalidated: string[][]
  /** Adelanta el reloj de la API. */
  advance(minutes: number): void
  /** Pedido de la base por número. */
  order(number: string): MockOrder
}

/**
 * Crea una base sembrada con `demo: 'admin'` (fechas relativas a `now`) e inicia sesión.
 *
 * @param now - Momento de la siembra y del reloj; por omisión {@link DEMO_NOW}.
 * @param options - `demo: false` siembra la base sin los datos de demostración.
 */
export async function createAdminDemoApi(
  now: Date = DEMO_NOW,
  options: { demo?: boolean } = {},
): Promise<AdminDemoApi> {
  let clock = now
  const invalidated: string[][] = []
  const mock = createMockApi({
    now: () => clock,
    onInvalidate: (tags) => invalidated.push([...tags]),
  })
  Object.assign(
    mock.db,
    createMockDb({
      ...DEFAULT_MOCK_DB_OPTIONS,
      ...(options.demo === false ? {} : { demo: 'admin' as const }),
      now,
    }),
  )
  await loginAsAdmin(mock)
  return {
    ...mock,
    invalidated,
    advance(minutes) {
      clock = new Date(clock.getTime() + minutes * 60_000)
    },
    order(number) {
      const found = mock.db.orders.find((candidate) => candidate.number === number)
      if (found === undefined) throw new Error(`No está el pedido ${number}`)
      return found
    },
  }
}
