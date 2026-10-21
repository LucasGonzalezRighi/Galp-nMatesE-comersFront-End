/**
 * Modo de prueba de la API: una base en memoria y un `fetch` que responde como el servidor,
 * para trabajar el front sin backend.
 *
 * @packageDocumentation
 */
export type { MockFetchOptions } from './mock-fetch'
export type { MockPlan, PendingOperation } from './pending'
export type { PersistentMockDb, PersistentMockDbOptions, StorageLike } from './storage'
export type {
  MockAdminSession,
  MockCategory,
  MockContent,
  MockDb,
  MockProduct,
  MockReview,
} from './types'
export {
  createMockDb,
  DEFAULT_MOCK_DB_OPTIONS,
  getGlobalMockDb,
  type MockDbOptions,
  resetGlobalMockDb,
} from './db'
export { IMPLEMENTED_ROUTES } from './handlers'
export { createMockFetch } from './mock-fetch'
export { PENDING_OPERATIONS } from './pending'
export { createPersistentMockDb, safeSessionStorage } from './storage'
