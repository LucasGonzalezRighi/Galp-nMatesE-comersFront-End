/** Modo de la API: `mock` usa la API simulada del front y `live` el backend real. */
export type ApiMode = 'live' | 'mock'

/** Configuración de la tienda ya validada. La arma {@link parseStoreEnv}. */
export interface StoreEnv {
  /** Modo de la API (`API_MODE`); por omisión `mock`. */
  apiMode: ApiMode
  /** Origen del backend (`API_BASE_URL`), sin barra final; `null` en modo de prueba. */
  apiBaseUrl: string | null
  /** Secreto de `/api/revalidate` (`REVALIDATE_SECRET`); en modo de prueba, uno de desarrollo. */
  revalidateSecret: string
  /** Latencia simulada de la API de prueba (`MOCK_LATENCY_MS`): milisegundos fijos o un rango `[mínimo, máximo]`. */
  mockLatencyMs: number | readonly [number, number]
  /** Origen público de la tienda (`NEXT_PUBLIC_SITE_URL`), sin barra final. */
  siteUrl: string
  /** Clave pública de Mercado Pago (`NEXT_PUBLIC_MP_PUBLIC_KEY`); `null` si no se cargó. */
  mpPublicKey: string | null
  /** Nombre de la cuenta de Cloudinary (`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`); `null` si no se cargó. */
  cloudinaryCloudName: string | null
}

/** Origen de la tienda mientras se desarrolla. */
export const DEFAULT_SITE_URL = 'http://localhost:3000'

/** Secreto de `/api/revalidate` para el modo de prueba. En vivo hace falta uno propio. */
const DEV_REVALIDATE_SECRET = 'dev-only-revalidate-secret-change-me-0000'

/** Latencia por omisión de la API de prueba, en milisegundos. */
const DEFAULT_MOCK_LATENCY_MS = [150, 400] as const

/** Largo mínimo del secreto de `/api/revalidate` en vivo. */
const MIN_LIVE_SECRET_LENGTH = 32

/** Una cuenta de Cloudinary: letras, números, guiones y guiones bajos. */
const CLOUD_NAME_PATTERN = /^[a-z0-9_-]+$/i

/**
 * Error de configuración: junta todos los problemas de las variables de entorno, en español, para
 * que se corrijan de una vez.
 */
export class EnvError extends Error {
  /** Un mensaje por cada variable mal configurada. */
  readonly problems: readonly string[]

  /**
   * @param problems - Los problemas encontrados; tiene que haber al menos uno.
   * @throws {RangeError} Si la lista está vacía.
   */
  constructor(problems: readonly string[]) {
    if (problems.length === 0) {
      throw new RangeError('EnvError necesita al menos un problema para informar.')
    }
    super(
      `La configuración de entorno de la tienda no es válida:\n${problems.map((problem) => `- ${problem}`).join('\n')}`,
    )
    this.name = 'EnvError'
    this.problems = problems
  }
}

/**
 * Interpreta un texto como el origen de un sitio `http` o `https` (sin ruta, búsqueda ni
 * credenciales, y sin `;`, `,` ni espacios en el host, que cortarían la CSP).
 *
 * @param value - Por ejemplo `https://api.galponmates.com.ar`; una barra final se acepta.
 * @returns El origen normalizado (sin barra final), o `null` si no es un origen válido.
 */
export function parseHttpOrigin(value: string): string | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  const isHttp = url.protocol === 'http:' || url.protocol === 'https:'
  const isBare = url.pathname === '/' && url.search === '' && url.hash === ''
  // `;` y `,` son válidos en un host, pero cortarían la directiva de la CSP donde se copia.
  const hasCspSeparator = /[;,\s]/.test(url.hostname)
  const hasCredentials = url.username !== '' || url.password !== ''
  return isHttp && isBare && !hasCredentials && !hasCspSeparator ? url.origin : null
}

/** El valor de la variable sin espacios en los bordes, o `undefined` si falta o está vacía. */
function readVariable(
  source: Readonly<Record<string, string | undefined>>,
  name: string,
): string | undefined {
  const value = source[name]?.trim()
  return value === undefined || value === '' ? undefined : value
}

/** Interpreta `MOCK_LATENCY_MS`: `"200"` o un rango `"150-400"`; `null` si no sirve. */
function parseMockLatency(value: string): number | readonly [number, number] | null {
  const single = /^(\d+)$/.exec(value)
  if (single?.[1] !== undefined) {
    const ms = Number(single[1])
    return Number.isSafeInteger(ms) ? ms : null
  }
  const range = /^(\d+)-(\d+)$/.exec(value)
  if (range?.[1] === undefined || range[2] === undefined) return null
  const min = Number(range[1])
  const max = Number(range[2])
  return Number.isSafeInteger(min) && Number.isSafeInteger(max) && min <= max ? [min, max] : null
}

/**
 * Valida las variables de entorno de la tienda.
 *
 * Una variable vacía cuenta como ausente. En modo de prueba (`API_MODE=mock`, lo normal) alcanza
 * con no definir nada; en vivo exigen `API_BASE_URL`, `NEXT_PUBLIC_MP_PUBLIC_KEY` y un
 * `REVALIDATE_SECRET` de 32 caracteres o más.
 *
 * @param source - Las variables, normalmente `process.env`.
 * @throws {EnvError} Con todos los problemas encontrados, en español.
 */
export function parseStoreEnv(source: Readonly<Record<string, string | undefined>>): StoreEnv {
  const problems: string[] = []

  const modeText = readVariable(source, 'API_MODE') ?? 'mock'
  const apiMode: ApiMode | null = modeText === 'mock' || modeText === 'live' ? modeText : null
  if (apiMode === null) problems.push('API_MODE tiene que ser "mock" o "live"')
  const publicMode = readVariable(source, 'NEXT_PUBLIC_API_MODE')
  if (apiMode !== null && publicMode !== undefined && publicMode !== apiMode) {
    problems.push('NEXT_PUBLIC_API_MODE tiene que ser igual a API_MODE')
  }
  const isLive = apiMode === 'live'

  let apiBaseUrl: string | null = null
  const baseUrlText = readVariable(source, 'API_BASE_URL')
  if (isLive) {
    if (baseUrlText === undefined) {
      problems.push('API_BASE_URL es obligatoria cuando API_MODE=live')
    } else {
      apiBaseUrl = parseHttpOrigin(baseUrlText)
      if (apiBaseUrl === null) {
        problems.push(
          'API_BASE_URL tiene que ser un origen http(s) sin ruta, por ejemplo https://api.galponmates.com.ar',
        )
      }
    }
  }

  const mpPublicKey = readVariable(source, 'NEXT_PUBLIC_MP_PUBLIC_KEY') ?? null
  if (isLive && mpPublicKey === null) {
    problems.push('NEXT_PUBLIC_MP_PUBLIC_KEY es obligatoria cuando API_MODE=live')
  }

  let revalidateSecret = readVariable(source, 'REVALIDATE_SECRET')
  if (isLive) {
    if (revalidateSecret === undefined) {
      problems.push('REVALIDATE_SECRET es obligatoria cuando API_MODE=live')
    } else if (revalidateSecret.length < MIN_LIVE_SECRET_LENGTH) {
      problems.push(
        `REVALIDATE_SECRET tiene que tener ${String(MIN_LIVE_SECRET_LENGTH)} caracteres o más`,
      )
    }
  }
  revalidateSecret ??= DEV_REVALIDATE_SECRET

  let mockLatencyMs: number | readonly [number, number] = DEFAULT_MOCK_LATENCY_MS
  const latencyText = readVariable(source, 'MOCK_LATENCY_MS')
  if (latencyText !== undefined) {
    const latency = parseMockLatency(latencyText)
    if (latency === null) {
      problems.push(
        'MOCK_LATENCY_MS tiene que ser un número de milisegundos ("0", "200") o un rango ("150-400")',
      )
    } else {
      mockLatencyMs = latency
    }
  }

  let siteUrl = DEFAULT_SITE_URL
  const siteUrlText = readVariable(source, 'NEXT_PUBLIC_SITE_URL')
  if (siteUrlText !== undefined) {
    const origin = parseHttpOrigin(siteUrlText)
    if (origin === null) {
      problems.push(
        'NEXT_PUBLIC_SITE_URL tiene que ser un origen http(s) sin ruta, por ejemplo https://galponmates.com.ar',
      )
    } else {
      siteUrl = origin
    }
  }

  const cloudinaryCloudName = readVariable(source, 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME') ?? null
  if (cloudinaryCloudName !== null && !CLOUD_NAME_PATTERN.test(cloudinaryCloudName)) {
    problems.push(
      'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME solo puede tener letras, números, guiones y guiones bajos',
    )
  }

  if (apiMode === null || problems.length > 0) throw new EnvError(problems)
  return {
    apiMode,
    apiBaseUrl,
    revalidateSecret,
    mockLatencyMs,
    siteUrl,
    mpPublicKey,
    cloudinaryCloudName,
  }
}

let cachedEnv: StoreEnv | undefined

/**
 * Configuración de la tienda leída de `process.env`, validada una sola vez. Solo para el
 * servidor: en el navegador las variables no están, y se usan las `NEXT_PUBLIC_*` directamente.
 *
 * @throws {EnvError} Si la configuración no es válida.
 * @throws {Error} Si se llama desde el navegador.
 */
export function getStoreEnv(): StoreEnv {
  if (typeof window !== 'undefined') {
    throw new Error('getStoreEnv solo se puede usar en el servidor.')
  }
  cachedEnv ??= parseStoreEnv(process.env)
  return cachedEnv
}
