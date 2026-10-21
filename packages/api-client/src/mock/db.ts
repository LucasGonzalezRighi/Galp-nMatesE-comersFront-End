import type { MockDb } from './types'
import {
  FIXTURE_CATEGORIES,
  FIXTURE_CONTENT,
  FIXTURE_PRODUCTS,
  FIXTURE_REVIEWS,
  FIXTURE_SETTINGS,
} from './fixtures'

/** Versión actual del formato de la base simulada. */
export const MOCK_DB_VERSION = 1

/** Cuenta del administrador con la que se siembra la base simulada. */
export interface MockDbOptions {
  /** Email de inicio de sesión del administrador. */
  adminEmail: string
  /** Contraseña de prueba del administrador. */
  adminPassword: string
}

/** Cuenta de fábrica del modo de prueba: la misma que usan por defecto la tienda y el admin. */
export const DEFAULT_MOCK_DB_OPTIONS: MockDbOptions = {
  adminEmail: 'admin@galponmates.com.ar',
  adminPassword: 'galpon-demo-2026',
}

/** La base compartida del servidor cuelga de `globalThis` con este nombre. */
interface GlobalMockDbHolder {
  /** Base simulada única del proceso, o `undefined` si todavía no se creó. */
  __galponMockDb?: MockDb
}

/** `globalThis` con el lugar donde se guarda la base compartida. */
function globalHolder(): typeof globalThis & GlobalMockDbHolder {
  return globalThis
}

/**
 * Crea una base simulada nueva, sembrada con copias profundas de los fixtures del diseño.
 *
 * Modificarla no cambia los fixtures ni otras bases.
 *
 * @param options - Cuenta del administrador con la que se siembra.
 * @returns La base, sin sesión abierta y sin pedidos, mensajes ni clientes.
 * @throws {RangeError} Si el email o la contraseña del administrador están vacíos.
 */
export function createMockDb(options: MockDbOptions): MockDb {
  if (options.adminEmail.trim() === '') {
    throw new RangeError('El email del administrador no puede estar vacío.')
  }
  if (options.adminPassword === '') {
    throw new RangeError('La contraseña del administrador no puede estar vacía.')
  }
  return {
    version: MOCK_DB_VERSION,
    categories: structuredClone([...FIXTURE_CATEGORIES]),
    products: structuredClone([...FIXTURE_PRODUCTS]),
    reviews: structuredClone([...FIXTURE_REVIEWS]),
    content: structuredClone(FIXTURE_CONTENT),
    settings: structuredClone(FIXTURE_SETTINGS),
    adminAccount: { email: options.adminEmail, password: options.adminPassword },
    adminSession: null,
    orders: [],
    messages: [],
    customers: [],
  }
}

/**
 * Devuelve la base simulada única del proceso, y la crea la primera vez.
 *
 * Vive en `globalThis.__galponMockDb`, así que dos copias del módulo (un bundle por ruta de
 * Next o una recarga en caliente) ven los mismos datos. Una vez creada, las `options` se ignoran.
 *
 * @param options - Cuenta del administrador con la que se siembra la primera vez.
 * @returns La base compartida.
 * @throws {RangeError} Si hace falta crearla y el email o la contraseña están vacíos.
 */
export function getGlobalMockDb(options: MockDbOptions): MockDb {
  const holder = globalHolder()
  holder.__galponMockDb ??= createMockDb(options)
  return holder.__galponMockDb
}

/** Descarta la base compartida: la próxima llamada a {@link getGlobalMockDb} crea una nueva. */
export function resetGlobalMockDb(): void {
  globalHolder().__galponMockDb = undefined
}
