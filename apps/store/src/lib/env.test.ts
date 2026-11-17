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
      mockInProduction: false,
      trustedClientIpHeader: null,
      mockAdminPassword: null,
      mockControlSecret: null,
      routeCacheMaxBytes: 256 * 1024 * 1024,
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

describe('parseStoreEnv en producción (NODE_ENV=production)', () => {
  const production = { NODE_ENV: 'production' }

  it.each([{}, { API_MODE: '' }, { API_MODE: '  ' }])(
    'sin API_MODE (%o) no arranca y lo dice claro',
    (extra) => {
      expect(problemsOf({ ...production, ...extra })).toEqual([
        'API_MODE es obligatoria en producción (NODE_ENV=production): "live" para el backend real, o "mock" con MOCK_ALLOWED_IN_PRODUCTION=true solo para pruebas',
      ])
    },
  )

  it('API_MODE=mock sin MOCK_ALLOWED_IN_PRODUCTION=true no arranca', () => {
    for (const allowed of [undefined, '', '1', 'yes', 'TRUE ']) {
      expect(
        problemsOf({ ...production, API_MODE: 'mock', MOCK_ALLOWED_IN_PRODUCTION: allowed }),
      ).toEqual([
        'API_MODE=mock en producción necesita MOCK_ALLOWED_IN_PRODUCTION=true: la API simulada no tiene autenticación real',
      ])
    }
  })

  it('API_MODE=mock con MOCK_ALLOWED_IN_PRODUCTION=true arranca y marca el aviso', () => {
    expect(
      parseStoreEnv({ ...production, API_MODE: 'mock', MOCK_ALLOWED_IN_PRODUCTION: 'true' }),
    ).toMatchObject({ apiMode: 'mock', mockInProduction: true })
  })

  it('en vivo completo arranca sin aviso', () => {
    expect(parseStoreEnv({ ...production, ...liveEnv })).toMatchObject({
      apiMode: 'live',
      mockInProduction: false,
    })
  })

  it('fuera de producción el modo de prueba sigue siendo el de omisión', () => {
    for (const NODE_ENV of ['development', 'test']) {
      expect(parseStoreEnv({ NODE_ENV })).toMatchObject({
        apiMode: 'mock',
        mockInProduction: false,
      })
    }
  })

  it('con requireModeInProduction: false (next typegen y next build) no exige API_MODE', () => {
    expect(parseStoreEnv(production, { requireModeInProduction: false })).toMatchObject({
      apiMode: 'mock',
      mockInProduction: true,
    })
  })
})

describe('MOCK_ADMIN_PASSWORD', () => {
  it('por omisión es null', () => {
    expect(parseStoreEnv({}).mockAdminPassword).toBeNull()
  })

  it('con 10 a 128 caracteres, letras y números, queda como contraseña del admin simulado', () => {
    expect(parseStoreEnv({ MOCK_ADMIN_PASSWORD: ' mate-amargo-2027 ' }).mockAdminPassword).toBe(
      'mate-amargo-2027',
    )
  })

  it.each(['corta-1', 'sin-numeros-nunca', '12345678901', `a1${'x'.repeat(127)}`])(
    '"%s" no sirve y tira',
    (password) => {
      expect(problemsOf({ MOCK_ADMIN_PASSWORD: password })).toEqual([
        'MOCK_ADMIN_PASSWORD tiene que tener de 10 a 128 caracteres, con letras y números',
      ])
    },
  )

  it('en vivo se ignora', () => {
    expect(parseStoreEnv({ ...liveEnv, MOCK_ADMIN_PASSWORD: 'corta' }).mockAdminPassword).toBeNull()
  })
})

describe('MOCK_CONTROL_SECRET', () => {
  it('por omisión es null', () => {
    expect(parseStoreEnv({}).mockControlSecret).toBeNull()
  })

  it('con 32 caracteres o más queda como secreto de los controles', () => {
    expect(parseStoreEnv({ MOCK_CONTROL_SECRET: 's'.repeat(32) }).mockControlSecret).toBe(
      's'.repeat(32),
    )
  })

  it('más corto tira', () => {
    expect(problemsOf({ MOCK_CONTROL_SECRET: 's'.repeat(31) })).toEqual([
      'MOCK_CONTROL_SECRET tiene que tener 32 caracteres o más',
    ])
  })

  it('en vivo se ignora', () => {
    expect(parseStoreEnv({ ...liveEnv, MOCK_CONTROL_SECRET: 'corto' }).mockControlSecret).toBeNull()
  })
})

describe('TRUSTED_CLIENT_IP_HEADER', () => {
  it('por omisión es null', () => {
    expect(parseStoreEnv({}).trustedClientIpHeader).toBeNull()
  })

  it('queda en minúsculas, sin espacios en los bordes', () => {
    expect(
      parseStoreEnv({ TRUSTED_CLIENT_IP_HEADER: ' CF-Connecting-IP ' }).trustedClientIpHeader,
    ).toBe('cf-connecting-ip')
  })

  it.each(['x forwarded', 'x-ip:', 'ñandú', 'a,b'])(
    '"%s" no es un nombre de cabecera y tira',
    (name) => {
      expect(problemsOf({ TRUSTED_CLIENT_IP_HEADER: name })).toEqual([
        'TRUSTED_CLIENT_IP_HEADER tiene que ser el nombre de una cabecera, por ejemplo cf-connecting-ip',
      ])
    },
  )
})

describe('ROUTE_CACHE_MAX_MB', () => {
  it('por omisión el tope de la caché de páginas es de 256 MB', () => {
    expect(parseStoreEnv({}).routeCacheMaxBytes).toBe(256 * 1024 * 1024)
  })

  it('acepta un entero de MB entre 16 y 102400 y lo pasa a bytes', () => {
    expect(parseStoreEnv({ ROUTE_CACHE_MAX_MB: '16' }).routeCacheMaxBytes).toBe(16 * 1024 * 1024)
    expect(parseStoreEnv({ ROUTE_CACHE_MAX_MB: ' 1024 ' }).routeCacheMaxBytes).toBe(
      1024 * 1024 * 1024,
    )
  })

  it.each(['0', '15', '102401', '64.5', '-64', '64MB', 'mucho'])(
    '"%s" no es un tope válido y tira',
    (value) => {
      expect(problemsOf({ ROUTE_CACHE_MAX_MB: value })).toEqual([
        'ROUTE_CACHE_MAX_MB tiene que ser un número entero de MB entre 16 y 102400, por ejemplo 256',
      ])
    },
  )
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
