import type { MockDbOptions } from './db'
import type { MockAdminSession, MockDb, MockMedia } from './types'
import { createMockDb, MOCK_DB_VERSION } from './db'

/** Lo mínimo que se le pide a un almacenamiento: leer, escribir y borrar un texto por clave. */
export type StorageLike = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>

/** Opciones de {@link createPersistentMockDb}. */
export interface PersistentMockDbOptions extends MockDbOptions {
  /** Dónde se guarda la base, o `null` para trabajar solo en memoria. */
  storage: StorageLike | null
  /** Clave bajo la que se guarda la base. */
  key: string
}

/** Base simulada con la que se puede guardar y reiniciar lo hecho en el modo de prueba. */
export interface PersistentMockDb {
  /** La base; es siempre el mismo objeto, también después de {@link PersistentMockDb.reset}. */
  readonly db: MockDb
  /**
   * Si los cambios se guardan: `false` cuando no hay almacenamiento o dejó de funcionar.
   * Cambia a `false` si el almacenamiento falla más tarde, así que se lee cada vez, sin copiarlo.
   */
  readonly isPersistent: boolean
  /** Guarda la base en el almacenamiento; si falla, sigue en memoria y `isPersistent` pasa a `false`. */
  persist(): void
  /** Vuelve a los fixtures del diseño (en el mismo objeto `db`) y borra lo guardado. */
  reset(): void
}

/** Clave que se usa solo para comprobar que el almacenamiento deja escribir. */
const PROBE_KEY = '__galpon-storage-probe__'

/**
 * Devuelve `sessionStorage` si se puede usar y `null` si no.
 *
 * Con la navegación privada o ciertas políticas del navegador, acceder a `sessionStorage` o
 * escribir en él tira un error: en ese caso el modo de prueba sigue funcionando en memoria.
 *
 * @returns El almacenamiento de la sesión, o `null` si no existe o si escribir en él falla.
 */
export function safeSessionStorage(): StorageLike | null {
  try {
    if (typeof sessionStorage === 'undefined') return null
    sessionStorage.setItem(PROBE_KEY, '1')
    sessionStorage.removeItem(PROBE_KEY)
    return sessionStorage
  } catch {
    return null
  }
}

/** Indica si un valor es un objeto común (no `null` ni un arreglo). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Indica si `value` es un objeto cuyos campos `names` son todos textos. */
function hasTextFields(value: unknown, names: readonly string[]): value is Record<string, string> {
  return isRecord(value) && names.every((name) => typeof value[name] === 'string')
}

/** Indica si `value` es una sesión del administrador con sus tres textos y un vencimiento que es fecha. */
function isAdminSession(value: unknown): value is MockAdminSession {
  return (
    hasTextFields(value, ['email', 'csrfToken', 'expiresAt']) &&
    !Number.isNaN(Date.parse(value.expiresAt ?? ''))
  )
}

/** Indica si `value` es una foto simulada: data URL, medidas numéricas y fecha de subida. */
function isMockMedia(value: unknown): value is MockMedia {
  return (
    hasTextFields(value, ['url', 'createdAt']) &&
    typeof value.width === 'number' &&
    typeof value.height === 'number'
  )
}

/**
 * Revisa la forma de una base guardada: la versión, cada lista o grupo, cada foto simulada y, a
 * fondo, la cuenta y la sesión del administrador (si no tuvieran sus textos, el login o el
 * guardián de rutas fallarían).
 */
function isMockDb(value: unknown): value is MockDb {
  if (!isRecord(value)) return false
  return (
    value.version === MOCK_DB_VERSION &&
    [
      'categories',
      'products',
      'reviews',
      'orders',
      'messages',
      'customers',
      'customerSessions',
    ].every((name) => Array.isArray(value[name])) &&
    ['content', 'settings'].every((name) => isRecord(value[name])) &&
    isRecord(value.media) &&
    Object.values(value.media).every(isMockMedia) &&
    hasTextFields(value.adminAccount, ['email', 'password']) &&
    (value.adminSession === null || isAdminSession(value.adminSession))
  )
}

/**
 * Lee la base guardada bajo una clave.
 *
 * @returns La base, o `null` si no hay nada, no se puede leer como JSON o es de otra versión.
 * @throws Lo que tire `storage.getItem` si el almacenamiento no funciona.
 */
function readSavedDb(storage: StorageLike, key: string): MockDb | null {
  const text = storage.getItem(key)
  if (text === null) return null
  try {
    const saved: unknown = JSON.parse(text)
    return isMockDb(saved) ? saved : null
  } catch {
    return null
  }
}

/**
 * Crea la base simulada con persistencia opcional en un almacenamiento (en general `sessionStorage`).
 *
 * Si hay una base guardada con la misma versión, se usa tal cual (con la cuenta de administrador
 * que tenía); si no, o si está rota o es de otra versión, se siembra de nuevo con los fixtures y,
 * con `demo: 'admin'`, con los datos de demostración (también al reiniciar).
 * Nunca falla por culpa del almacenamiento y no escribe en la consola: avisa con `isPersistent`.
 *
 * @param options - Cuenta del administrador y datos de demostración para sembrar, almacenamiento y
 *   clave.
 * @returns La base, si se guarda, y las operaciones para guardarla y reiniciarla.
 * @throws {RangeError} Si la clave está vacía, la cuenta del administrador es inválida o `demo` o
 *   `now` no sirven.
 */
export function createPersistentMockDb(options: PersistentMockDbOptions): PersistentMockDb {
  const { storage, key } = options
  if (key.trim() === '') {
    throw new RangeError('La clave del almacenamiento no puede estar vacía.')
  }
  const dbOptions: MockDbOptions = {
    adminEmail: options.adminEmail,
    adminPassword: options.adminPassword,
    ...(options.demo === undefined ? {} : { demo: options.demo }),
    ...(options.now === undefined ? {} : { now: options.now }),
  }

  let persistent = storage !== null
  let saved: MockDb | null = null
  if (storage !== null) {
    try {
      saved = readSavedDb(storage, key)
    } catch {
      persistent = false
    }
  }
  const db = saved ?? createMockDb(dbOptions)

  return {
    db,
    get isPersistent() {
      return persistent
    },
    persist() {
      if (storage === null || !persistent) return
      try {
        storage.setItem(key, JSON.stringify(db))
      } catch {
        persistent = false
      }
    },
    reset() {
      Object.assign(db, createMockDb(dbOptions))
      if (storage === null || !persistent) return
      try {
        storage.removeItem(key)
      } catch {
        persistent = false
      }
    },
  }
}
