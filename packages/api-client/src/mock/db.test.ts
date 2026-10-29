import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SHIPPING_OPTIONS } from '@galpon/domain'
import type { StorageLike } from './storage'
import { createMockDb, DEFAULT_MOCK_DB_OPTIONS, getGlobalMockDb, resetGlobalMockDb } from './db'
import { FIXTURE_CONTENT, FIXTURE_PRODUCTS, FIXTURE_SETTINGS } from './fixtures'
import { createPersistentMockDb, safeSessionStorage } from './storage'

const OPTIONS = { adminEmail: 'dueno@galpon.test', adminPassword: 'clave-de-prueba-1' }
const KEY = 'galpon-mock-db'
const SESSION_EXPIRES = '2026-10-21T15:00:00Z'

/** Almacenamiento en memoria con la misma forma que `sessionStorage`. */
function memoryStorage() {
  const data = new Map<string, string>()
  const storage: StorageLike = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
  }
  return { storage, data }
}

afterEach(() => {
  resetGlobalMockDb()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('createMockDb', () => {
  it('siembra los fixtures, la cuenta del admin y las listas vacías', () => {
    const db = createMockDb(OPTIONS)
    expect(db.version).toBe(3)
    expect(db.media).toEqual({})
    expect(db.products.every((product) => product.updatedAt === product.createdAt)).toBe(true)
    expect(db.categories).toHaveLength(6)
    expect(db.products).toHaveLength(27)
    expect(db.reviews).toHaveLength(15)
    expect(db.settings).toEqual(FIXTURE_SETTINGS)
    expect(db.content).toEqual(FIXTURE_CONTENT)
    expect(db.adminAccount).toEqual({ email: 'dueno@galpon.test', password: 'clave-de-prueba-1' })
    expect(db.adminSession).toBeNull()
    expect(db.orders).toEqual([])
    expect(db.messages).toEqual([])
    expect(db.customers).toEqual([])
    expect(db.customerSessions).toEqual([])
  })

  it('las opciones de fábrica son las que usan la tienda y el admin', () => {
    expect(DEFAULT_MOCK_DB_OPTIONS).toEqual({
      adminEmail: 'admin@galponmates.com.ar',
      adminPassword: 'galpon-demo-2026',
    })
  })

  it('modificar la base no cambia los fixtures ni los envíos de fábrica', () => {
    const db = createMockDb(OPTIONS)
    db.products.splice(0, 5)
    const first = db.products[0]
    if (first === undefined) throw new Error('La base no tiene productos')
    first.name = 'Otro nombre'
    db.settings.kitDiscountPercent = 25
    db.content.home.hero.eyebrow = 'Otro texto'
    db.content.home.storyProducts.yerbas.push('otra-yerba')
    const home = db.settings.shippingOptions[0]
    if (home === undefined) throw new Error('Los ajustes no tienen envíos')
    home.costArs = 1
    db.settings.shippingOptions.push({ ...home, method: 'pickup' })

    expect(FIXTURE_PRODUCTS).toHaveLength(27)
    expect(FIXTURE_PRODUCTS[5]?.name).not.toBe('Otro nombre')
    expect(FIXTURE_SETTINGS.kitDiscountPercent).toBe(10)
    expect(FIXTURE_CONTENT.home.hero.eyebrow).toBe('Hechos para compartir')
    expect(FIXTURE_CONTENT.home.storyProducts.yerbas).toHaveLength(3)
    expect(FIXTURE_SETTINGS.shippingOptions).toHaveLength(3)
    expect(FIXTURE_SETTINGS.shippingOptions[0]?.costArs).toBe(6500)
    expect(DEFAULT_SHIPPING_OPTIONS[0]?.costArs).toBe(6500)
  })

  it('cada llamada devuelve una base nueva', () => {
    const a = createMockDb(OPTIONS)
    const b = createMockDb(OPTIONS)
    a.products.length = 0
    expect(b.products).toHaveLength(27)
  })

  it('rechaza un email o una contraseña vacíos', () => {
    expect(() => createMockDb({ ...OPTIONS, adminEmail: '  ' })).toThrow(RangeError)
    expect(() => createMockDb({ ...OPTIONS, adminPassword: '' })).toThrow(
      /contraseña del administrador/,
    )
  })
})

describe('base global', () => {
  it('es la misma aunque el módulo se cargue dos veces (bundles por ruta o HMR)', async () => {
    const a = (await import('./db')).getGlobalMockDb(OPTIONS)
    vi.resetModules()
    const b = (await import('./db')).getGlobalMockDb(OPTIONS)
    expect(b).toBe(a)
  })

  it('se guarda en globalThis.__galponMockDb', () => {
    const holder = globalThis as typeof globalThis & { __galponMockDb?: unknown }
    expect(holder.__galponMockDb).toBeUndefined()
    const db = getGlobalMockDb(OPTIONS)
    expect(holder.__galponMockDb).toBe(db)
  })

  it('conserva los cambios entre llamadas e ignora las opciones de la segunda', () => {
    const a = getGlobalMockDb(OPTIONS)
    a.settings.kitDiscountPercent = 20
    const b = getGlobalMockDb({ adminEmail: 'otro@galpon.test', adminPassword: 'otra-clave-1' })
    expect(b.settings.kitDiscountPercent).toBe(20)
    expect(b.adminAccount.email).toBe('dueno@galpon.test')
  })

  it('resetGlobalMockDb hace que la próxima llamada devuelva una base nueva', () => {
    const a = getGlobalMockDb(OPTIONS)
    a.settings.kitDiscountPercent = 20
    resetGlobalMockDb()
    const b = getGlobalMockDb(OPTIONS)
    expect(b).not.toBe(a)
    expect(b.settings.kitDiscountPercent).toBe(10)
  })
})

describe('createPersistentMockDb', () => {
  it('sin nada guardado siembra los fixtures y es persistente', () => {
    const { storage } = memoryStorage()
    const handle = createPersistentMockDb({ ...OPTIONS, storage, key: KEY })
    expect(handle.isPersistent).toBe(true)
    expect(handle.db).toEqual(createMockDb(OPTIONS))
  })

  it('persist() guarda y una base nueva con la misma clave recupera los cambios', () => {
    const { storage } = memoryStorage()
    const first = createPersistentMockDb({ ...OPTIONS, storage, key: KEY })
    first.db.settings.kitDiscountPercent = 15
    first.db.adminSession = {
      email: OPTIONS.adminEmail,
      csrfToken: 'token-de-prueba',
      expiresAt: '2026-10-21T15:00:00Z',
    }
    first.persist()

    const second = createPersistentMockDb({ ...OPTIONS, storage, key: KEY })
    expect(second.isPersistent).toBe(true)
    expect(second.db.settings.kitDiscountPercent).toBe(15)
    expect(second.db.adminSession?.csrfToken).toBe('token-de-prueba')
    expect(second.db).not.toBe(first.db)
  })

  it('con otra clave no ve lo guardado', () => {
    const { storage } = memoryStorage()
    const first = createPersistentMockDb({ ...OPTIONS, storage, key: KEY })
    first.db.settings.kitDiscountPercent = 15
    first.persist()
    const other = createPersistentMockDb({ ...OPTIONS, storage, key: 'otra-clave' })
    expect(other.db.settings.kitDiscountPercent).toBe(10)
  })

  it('con una version guardada distinta vuelve a sembrar los datos', () => {
    const { storage } = memoryStorage()
    storage.setItem(KEY, JSON.stringify({ ...createMockDb(OPTIONS), version: 0, products: [] }))
    const handle = createPersistentMockDb({ ...OPTIONS, storage, key: KEY })
    expect(handle.isPersistent).toBe(true)
    expect(handle.db.version).toBe(3)
    expect(handle.db.products).toHaveLength(27)
  })

  it('con una base guardada de la versión 2 (sin fotos) vuelve a sembrar los datos', () => {
    const { storage } = memoryStorage()
    const previous: Record<string, unknown> = { ...createMockDb(OPTIONS), version: 2, products: [] }
    delete previous.media
    storage.setItem(KEY, JSON.stringify(previous))
    const handle = createPersistentMockDb({ ...OPTIONS, storage, key: KEY })
    expect(handle.db).toEqual(createMockDb(OPTIONS))
  })

  it('recupera las fotos simuladas guardadas', () => {
    const { storage } = memoryStorage()
    const first = createPersistentMockDb({ ...OPTIONS, storage, key: KEY })
    first.db.media['galpon/productos/mock-1'] = {
      url: 'data:image/webp;base64,AA==',
      width: 900,
      height: 1200,
      createdAt: SESSION_EXPIRES,
    }
    first.persist()
    const second = createPersistentMockDb({ ...OPTIONS, storage, key: KEY })
    expect(second.db.media).toEqual(first.db.media)
  })

  it('con un texto roto o de otra forma vuelve a sembrar los datos', () => {
    for (const saved of ['{no es json', 'null', '"texto"', '{"version":1}', '[]']) {
      const { storage } = memoryStorage()
      storage.setItem(KEY, saved)
      const handle = createPersistentMockDb({ ...OPTIONS, storage, key: KEY })
      expect(handle.db).toEqual(createMockDb(OPTIONS))
    }
  })

  it.each([
    ['una cuenta del admin sin email', { adminAccount: { password: 'clave' } }],
    [
      'una contraseña del admin que no es un texto',
      { adminAccount: { email: 'a@b.c', password: 5 } },
    ],
    ['una sesión sin token CSRF', { adminSession: { email: 'a@b.c', expiresAt: SESSION_EXPIRES } }],
    [
      'una sesión con el email que no es un texto',
      { adminSession: { email: null, csrfToken: 'token', expiresAt: SESSION_EXPIRES } },
    ],
    [
      'una sesión con un vencimiento que no es una fecha',
      { adminSession: { email: 'a@b.c', csrfToken: 'token', expiresAt: 'mañana' } },
    ],
    ['una sesión que es un arreglo', { adminSession: [] }],
    ['fotos que son un arreglo', { media: [] }],
    [
      'una foto sin su data URL',
      { media: { 'galpon/productos/mock-1': { width: 1, height: 1, createdAt: SESSION_EXPIRES } } },
    ],
    [
      'una foto con medidas que no son números',
      {
        media: {
          'galpon/productos/mock-1': {
            url: 'data:image/webp;base64,AA==',
            width: '1',
            height: 1,
            createdAt: SESSION_EXPIRES,
          },
        },
      },
    ],
  ])('con %s guardada vuelve a sembrar los datos', (_description, broken) => {
    const { storage } = memoryStorage()
    storage.setItem(KEY, JSON.stringify({ ...createMockDb(OPTIONS), ...broken }))
    const handle = createPersistentMockDb({ ...OPTIONS, storage, key: KEY })
    expect(handle.db).toEqual(createMockDb(OPTIONS))
  })

  it('con un almacenamiento cuyo getItem tira, funciona en memoria (isPersistent false)', () => {
    const storage: StorageLike = {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    }
    const handle = createPersistentMockDb({ ...OPTIONS, storage, key: KEY })
    expect(handle.isPersistent).toBe(false)
    expect(handle.db.products).toHaveLength(27)
    handle.db.settings.kitDiscountPercent = 12
    expect(() => {
      handle.persist()
    }).not.toThrow()
    expect(handle.db.settings.kitDiscountPercent).toBe(12)
  })

  it('sin almacenamiento (null) funciona en memoria', () => {
    const handle = createPersistentMockDb({ ...OPTIONS, storage: null, key: KEY })
    expect(handle.isPersistent).toBe(false)
    expect(handle.db.products).toHaveLength(27)
    expect(() => {
      handle.persist()
      handle.reset()
    }).not.toThrow()
  })

  it('si setItem tira al guardar, no rompe y deja de ser persistente', () => {
    const { storage } = memoryStorage()
    const handle = createPersistentMockDb({ ...OPTIONS, storage, key: KEY })
    storage.setItem = () => {
      throw new Error('cuota llena')
    }
    expect(() => {
      handle.persist()
    }).not.toThrow()
    expect(handle.isPersistent).toBe(false)
  })

  it('reset() vuelve a los fixtures en el mismo objeto y borra lo guardado', () => {
    const { storage, data } = memoryStorage()
    const handle = createPersistentMockDb({ ...OPTIONS, storage, key: KEY })
    const { db } = handle
    db.settings.kitDiscountPercent = 15
    db.products.length = 0
    handle.persist()
    expect(data.has(KEY)).toBe(true)

    handle.reset()
    expect(handle.db).toBe(db)
    expect(db.settings.kitDiscountPercent).toBe(10)
    expect(db.products).toHaveLength(27)
    expect(data.has(KEY)).toBe(false)
    expect(createPersistentMockDb({ ...OPTIONS, storage, key: KEY }).db.products).toHaveLength(27)
  })

  it('rechaza una clave vacía', () => {
    const { storage } = memoryStorage()
    expect(() => createPersistentMockDb({ ...OPTIONS, storage, key: ' ' })).toThrow(RangeError)
  })
})

describe('safeSessionStorage', () => {
  it('devuelve el almacenamiento cuando funciona y no deja rastros de la prueba', () => {
    const { storage, data } = memoryStorage()
    vi.stubGlobal('sessionStorage', storage)
    expect(safeSessionStorage()).toBe(storage)
    expect(data.size).toBe(0)
  })

  it('devuelve null cuando setItem tira', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => undefined,
    })
    expect(safeSessionStorage()).toBeNull()
  })

  it('devuelve null cuando acceder a sessionStorage tira', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError')
      },
    })
    try {
      expect(safeSessionStorage()).toBeNull()
    } finally {
      if (original === undefined) Reflect.deleteProperty(globalThis, 'sessionStorage')
      else Object.defineProperty(globalThis, 'sessionStorage', original)
    }
  })

  it('devuelve null cuando no existe', () => {
    vi.stubGlobal('sessionStorage', undefined)
    expect(safeSessionStorage()).toBeNull()
  })
})
