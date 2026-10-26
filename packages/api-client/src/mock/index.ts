/**
 * Modo de prueba de la API: una base en memoria y un `fetch` que responde como el servidor,
 * para trabajar el front sin backend.
 *
 * @packageDocumentation
 */
export type { MockCardHolder, MockCardToken, MockCardTokenInput } from './card-token'
export type {
  MockMercadoPagoResolveInput,
  MockMercadoPagoResolveResult,
} from './handlers/mercadopago-simulator'
export type {
  MockExpireOrderResult,
  MockProductChangeInput,
  MockProductChangeResult,
} from './handlers/mock-controls'
export type { HttpMethod } from './http'
export type { MockFetchOptions } from './mock-fetch'
export type { MockPlan, PendingOperation } from './pending'
export type { MockContext, MockRoute } from './router'
export type { PersistentMockDb, PersistentMockDbOptions, StorageLike } from './storage'
export type {
  MockAdminSession,
  MockCategory,
  MockContent,
  MockCustomer,
  MockCustomerSession,
  MockDb,
  MockMessage,
  MockOrder,
  MockOrderCreation,
  MockPaymentIntent,
  MockProduct,
  MockReservation,
  MockReview,
} from './types'
export { createMockCardToken, MOCK_CARD_HOLDERS, parseMockCardToken } from './card-token'
export {
  createMockDb,
  DEFAULT_MOCK_DB_OPTIONS,
  getGlobalMockDb,
  type MockDbOptions,
  resetGlobalMockDb,
} from './db'
export { IMPLEMENTED_ROUTES } from './handlers'
export { MOCK_PASSWORD_RESET_TOKEN } from './handlers/account'
export { DEFAULT_CUSTOMER_SESSION_COOKIE } from './handlers/customer-session'
export {
  INTERNAL_ROUTES,
  MOCK_MERCADOPAGO_RESOLVE_PATH,
  MOCK_MERCADOPAGO_RESULTS,
} from './handlers/mercadopago-simulator'
export {
  MOCK_CONTROL_ROUTES,
  MOCK_EXPIRE_ORDER_PATH,
  MOCK_PRODUCT_PATH,
} from './handlers/mock-controls'
export { createMockFetch } from './mock-fetch'
export { PENDING_OPERATIONS } from './pending'
export { createPersistentMockDb, safeSessionStorage } from './storage'
