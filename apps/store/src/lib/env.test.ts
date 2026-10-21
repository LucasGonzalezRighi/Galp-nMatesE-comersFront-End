import { describe, expect, it } from 'vitest'
import { EnvError, parseHttpOrigin, parseStoreEnv } from './env'

const liveEnv = {
  API_MODE: 'live',
  API_BASE_URL: 'https://api.galponmates.com.ar',
  NEXT_PUBLIC_MP_PUBLIC_KEY: 'APP_USR-0000',
  REVALIDATE_SECRET: 'a'.repeat(32),
}

/** Devuelve los problemas que informa `parseStoreEnv` para esa configuración. */
function problemsOf(source: Record<string, string | undefined>): readonly string[] {
  try {
    parseStoreEnv(source)
  } catch (error) {
    if (error instanceof EnvError) return error.problems
    throw error
  }
  throw new Error('parseStoreEnv no tiró y se esperaba que sí.')
}

describe('parseStoreEnv', () => {
  it('sin variables arranca en modo de prueba con los valores de desarrollo', () => {
    expect(parseStoreEnv({})).toEqual({
      apiMode: 'mock',
      apiBaseUrl: null,
      revalidateSecret: 'dev-only-revalidate-secret-change-me-0000',
      mockLatencyMs: [150, 400],
      siteUrl: 'http://localhost:3000',
      mpPublicKey: null,
      cloudinaryCloudName: null,
    })
  })

  it('en vivo, API_BASE_URL es obligatoria y el mensaje está en español', () => {
    expect(() => parseStoreEnv({ API_MODE: 'live' })).toThrow(EnvError)
    expect(() => parseStoreEnv({ API_MODE: 'live' })).toThrow(
      'API_BASE_URL es obligatoria cuando API_MODE=live',
    )
  })

  it('en vivo, informa todos los problemas juntos', () => {
    expect(problemsOf({ API_MODE: 'live' })).toEqual([
      'API_BASE_URL es obligatoria cuando API_MODE=live',
      'NEXT_PUBLIC_MP_PUBLIC_KEY es obligatoria cuando API_MODE=live',
      'REVALIDATE_SECRET es obligatoria cuando API_MODE=live',
    ])
  })

  it('NEXT_PUBLIC_API_MODE distinto de API_MODE tira', () => {
    expect(() => parseStoreEnv({ API_MODE: 'mock', NEXT_PUBLIC_API_MODE: 'live' })).toThrow(
      'NEXT_PUBLIC_API_MODE tiene que ser igual a API_MODE',
    )
  })

  it('NEXT_PUBLIC_API_MODE por defecto es igual a API_MODE', () => {
    expect(parseStoreEnv({ ...liveEnv, NEXT_PUBLIC_API_MODE: 'live' }).apiMode).toBe('live')
    expect(parseStoreEnv(liveEnv).apiMode).toBe('live')
  })

  it('en vivo completo devuelve la configuración', () => {
    expect(
      parseStoreEnv({ ...liveEnv, NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: 'galpon-mates' }),
    ).toMatchObject({
      apiMode: 'live',
      apiBaseUrl: 'https://api.galponmates.com.ar',
      revalidateSecret: 'a'.repeat(32),
      mpPublicKey: 'APP_USR-0000',
      cloudinaryCloudName: 'galpon-mates',
    })
  })

  it('en vivo, un secreto de 10 caracteres tira', () => {
    expect(problemsOf({ ...liveEnv, REVALIDATE_SECRET: 'a'.repeat(10) })).toEqual([
      'REVALIDATE_SECRET tiene que tener 32 caracteres o más',
    ])
  })

  it.each(['https://api.galponmates.com.ar/api/v1', 'api.galponmates.com.ar', 'ftp://x.com'])(
    'en vivo, API_BASE_URL "%s" no es un origen http(s) sin ruta',
    (apiBaseUrl) => {
      expect(problemsOf({ ...liveEnv, API_BASE_URL: apiBaseUrl })).toEqual([
        'API_BASE_URL tiene que ser un origen http(s) sin ruta, por ejemplo https://api.galponmates.com.ar',
      ])
    },
  )

  it('en vivo, una barra final de API_BASE_URL se quita', () => {
    expect(
      parseStoreEnv({ ...liveEnv, API_BASE_URL: 'https://api.galponmates.com.ar/' }),
    ).toMatchObject({ apiBaseUrl: 'https://api.galponmates.com.ar' })
  })

  it('en modo de prueba ignora API_BASE_URL y no exige las claves de vivo', () => {
    expect(
      parseStoreEnv({ API_MODE: 'mock', API_BASE_URL: 'https://otra.api' }).apiBaseUrl,
    ).toBeNull()
  })

  it('las variables vacías cuentan como ausentes', () => {
    expect(parseStoreEnv({ API_MODE: '', MOCK_LATENCY_MS: ' ', NEXT_PUBLIC_SITE_URL: '' })).toEqual(
      parseStoreEnv({}),
    )
  })

  it('API_MODE desconocido tira', () => {
    expect(problemsOf({ API_MODE: 'prod' })).toEqual(['API_MODE tiene que ser "mock" o "live"'])
  })

  describe('MOCK_LATENCY_MS', () => {
    it('"0" es 0', () => {
      expect(parseStoreEnv({ MOCK_LATENCY_MS: '0' }).mockLatencyMs).toBe(0)
    })

    it('"200" es una latencia fija', () => {
      expect(parseStoreEnv({ MOCK_LATENCY_MS: '200' }).mockLatencyMs).toBe(200)
    })

    it('"150-400" es un rango', () => {
      expect(parseStoreEnv({ MOCK_LATENCY_MS: '150-400' }).mockLatencyMs).toEqual([150, 400])
    })

    it.each(['rapido', '-5', '400-150', '1.5', '10-'])('"%s" tira', (value) => {
      expect(problemsOf({ MOCK_LATENCY_MS: value })).toEqual([
        'MOCK_LATENCY_MS tiene que ser un número de milisegundos ("0", "200") o un rango ("150-400")',
      ])
    })
  })

  describe('NEXT_PUBLIC_SITE_URL', () => {
    it('queda como origen, sin barra final', () => {
      expect(parseStoreEnv({ NEXT_PUBLIC_SITE_URL: 'https://galponmates.com.ar/' }).siteUrl).toBe(
        'https://galponmates.com.ar',
      )
    })

    it('con ruta tira', () => {
      expect(problemsOf({ NEXT_PUBLIC_SITE_URL: 'https://galponmates.com.ar/tienda' })).toEqual([
        'NEXT_PUBLIC_SITE_URL tiene que ser un origen http(s) sin ruta, por ejemplo https://galponmates.com.ar',
      ])
    })
  })

  it('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME con caracteres raros tira', () => {
    expect(problemsOf({ NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: 'a/b' })).toEqual([
      'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME solo puede tener letras, números, guiones y guiones bajos',
    ])
  })
})

describe('parseHttpOrigin', () => {
  it('devuelve el origen sin barra final', () => {
    expect(parseHttpOrigin('https://api.galponmates.com.ar/')).toBe(
      'https://api.galponmates.com.ar',
    )
    expect(parseHttpOrigin('http://localhost:4000')).toBe('http://localhost:4000')
  })

  it.each([
    'https://api.galponmates.com.ar;script-src',
    'https://api.galponmates.com.ar%3Bscript-src',
    'https://api.galponmates.com.ar;',
    'https://a,b.galponmates.com.ar',
    'https://api.galponmates.com.ar script-src',
  ])('rechaza "%s": un ";", una "," o un espacio en el host cortarían la CSP', (value) => {
    expect(parseHttpOrigin(value)).toBeNull()
  })
})

describe('EnvError', () => {
  it('lista los problemas en el mensaje', () => {
    const error = new EnvError(['uno', 'dos'])
    expect(error.name).toBe('EnvError')
    expect(error.problems).toEqual(['uno', 'dos'])
    expect(error.message).toBe(
      'La configuración de entorno de la tienda no es válida:\n- uno\n- dos',
    )
  })

  it('sin problemas es un error de uso', () => {
    expect(() => new EnvError([])).toThrow(RangeError)
  })
})
