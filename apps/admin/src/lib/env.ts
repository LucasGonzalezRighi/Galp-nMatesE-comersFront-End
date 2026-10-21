import { DEFAULT_MOCK_DB_OPTIONS } from '@galpon/api-client/mock'

/** Configuración del dashboard, ya validada. */
export interface AdminEnv {
  /** `mock` trabaja sin backend; `live` llama a la API real. */
  apiMode: 'mock' | 'live'
  /** URL base de la API sin barra final (solo en `live`), o `null` en modo de prueba. */
  apiBaseUrl: string | null
  /** URL de la tienda, sin barra final: el dashboard enlaza a ella. */
  storeUrl: string
  /** Email del administrador de prueba (solo en modo de prueba). */
  mockAdminEmail: string
  /** Contraseña del administrador de prueba (solo en modo de prueba). */
  mockAdminPassword: string
  /** Demora simulada de la API de prueba: un número fijo o un rango `[mínimo, máximo]`, en ms. */
  mockLatencyMs: number | readonly [number, number]
}

/** Variables de entorno tal como llegan (por ejemplo `import.meta.env`). */
type EnvSource = Readonly<Record<string, unknown>>

/** Tienda que se enlaza cuando no se configura otra: la de desarrollo. */
const DEFAULT_STORE_URL = 'http://localhost:3000'

/** Latencia por omisión del modo de prueba: se sortea entre 150 y 400 ms, como una API real. */
const DEFAULT_LATENCY_MS = [150, 400] as const

/** Devuelve el texto de una variable, o `undefined` si no está o está vacía. */
function readVar(source: EnvSource, name: string): string | undefined {
  const value = source[name]
  return typeof value === 'string' && value !== '' ? value : undefined
}

/** Valida que una variable sea una URL absoluta `http(s)` y la devuelve sin barra final. */
function parseUrl(name: string, value: string): string {
  let url: URL | null = null
  try {
    url = new URL(value)
  } catch {
    // Se informa abajo, con el mismo mensaje que si el protocolo no es http(s).
  }
  if (url?.protocol !== 'http:' && url?.protocol !== 'https:') {
    throw new RangeError(
      `${name} tiene que ser una URL absoluta con http o https (por ejemplo "http://localhost:4000"), y recibió ${JSON.stringify(value)}.`,
    )
  }
  return value.trim().replace(/\/+$/, '')
}

/** Valida la latencia: un número de ms (`200`) o un rango (`100-300`). */
function parseLatency(name: string, value: string | undefined): number | readonly [number, number] {
  if (value === undefined) return DEFAULT_LATENCY_MS
  const single = /^(\d+)$/.exec(value)
  if (single?.[1] !== undefined) return Number(single[1])
  const range = /^(\d+)-(\d+)$/.exec(value)
  if (range?.[1] !== undefined && range[2] !== undefined && Number(range[1]) <= Number(range[2])) {
    return [Number(range[1]), Number(range[2])]
  }
  throw new RangeError(
    `${name} tiene que ser un número de milisegundos (por ejemplo "200") o un rango ordenado (por ejemplo "100-300"), y recibió ${JSON.stringify(value)}.`,
  )
}

/**
 * Valida las variables de entorno del dashboard (`VITE_*`) al arrancar.
 *
 * Sin variables, arranca en modo de prueba con la cuenta de administrador de fábrica
 * (`DEFAULT_MOCK_DB_OPTIONS`) y la tienda en `http://localhost:3000`. Una variable vacía cuenta
 * como ausente.
 *
 * @param source - Las variables, por ejemplo `import.meta.env`.
 * @returns La configuración validada.
 * @throws {RangeError} Con un mensaje en español que nombra la variable, si alguna no sirve o
 *   si falta `VITE_API_BASE_URL` con `VITE_API_MODE=live`.
 */
export function parseAdminEnv(source: EnvSource): AdminEnv {
  const mode = readVar(source, 'VITE_API_MODE') ?? 'mock'
  if (mode !== 'mock' && mode !== 'live') {
    throw new RangeError(
      `VITE_API_MODE tiene que ser "mock" o "live", y recibió ${JSON.stringify(mode)}.`,
    )
  }
  const baseUrl = readVar(source, 'VITE_API_BASE_URL')
  if (mode === 'live' && baseUrl === undefined) {
    throw new RangeError('VITE_API_BASE_URL es obligatoria cuando VITE_API_MODE=live.')
  }
  return {
    apiMode: mode,
    apiBaseUrl:
      mode === 'live' && baseUrl !== undefined ? parseUrl('VITE_API_BASE_URL', baseUrl) : null,
    storeUrl: parseUrl('VITE_STORE_URL', readVar(source, 'VITE_STORE_URL') ?? DEFAULT_STORE_URL),
    mockAdminEmail: readVar(source, 'VITE_MOCK_ADMIN_EMAIL') ?? DEFAULT_MOCK_DB_OPTIONS.adminEmail,
    mockAdminPassword:
      readVar(source, 'VITE_MOCK_ADMIN_PASSWORD') ?? DEFAULT_MOCK_DB_OPTIONS.adminPassword,
    mockLatencyMs: parseLatency('VITE_MOCK_LATENCY_MS', readVar(source, 'VITE_MOCK_LATENCY_MS')),
  }
}
