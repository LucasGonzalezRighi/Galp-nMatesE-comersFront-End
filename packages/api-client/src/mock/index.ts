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
export type { MockMediaInput, MockMediaResult } from './handlers/admin-media'
export type {
  MockExpireOrderResult,
  MockProductChangeInput,
  MockProductChangeResult,
} from './handlers/mock-controls'
export type { HttpMethod } from './http'
export type { MockFetchOptions } from './mock-fetch'
export type { PendingOperation } from './pending'
export type { MockContext, MockRoute } from './router'
export type { PersistentMockDb, PersistentMockDbOptions, StorageLike } from './storage'
export type {
  MockAdminSession,
  MockCategory,
  MockContent,
  MockCustomer,
  MockCustomerSession,
  MockDb,
  MockMedia,
  MockMessage,
  MockOrder,
  MockOrderCreation,
  MockPasswordResetMail,
  MockPaymentIntent,
  MockProduct,
  MockReservation,
  MockReview,
} from './types'
export { MAX_MOCK_ADMIN_BODY_BYTES, MAX_MOCK_BODY_BYTES } from './body'
export { createMockCardToken, MOCK_CARD_HOLDERS, parseMockCardToken } from './card-token'
export {
  createMockDb,
  DEFAULT_MOCK_DB_OPTIONS,
  getGlobalMockDb,
  type MockDbOptions,
  type MockDemo,
  resetGlobalMockDb,
} from './db'
export { FIXTURE_ADMIN_DEMO } from './fixtures'
export { IMPLEMENTED_ROUTES } from './handlers'
export {
  MAX_MOCK_MEDIA,
  MAX_MOCK_MEDIA_LENGTH,
  MOCK_MEDIA_PATH,
  postMockMedia,
} from './handlers/admin-media'
export { PASSWORD_RESET_TTL_MS } from './handlers/account'
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
  SCENARIO_CONTROL_ROUTES,
} from './handlers/mock-controls'
export { MOCK_DB_LIMITS } from './limits'
export { createMockFetch } from './mock-fetch'
export { BACKEND_ONLY_OPERATIONS, PENDING_OPERATIONS } from './pending'
export { MOCK_ADMIN_SESSION_COOKIE } from './session-cookie'
export { createPersistentMockDb, safeSessionStorage } from './storage'
