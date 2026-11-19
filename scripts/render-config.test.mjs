import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { ADMIN_SECURITY_HEADERS, buildAdminCsp } from '../apps/admin/src/lib/csp.ts'

/** Lee un archivo de la raíz del repo. */
function readRoot(path) {
  return readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8')
}

/** `render.yaml`: el Blueprint de Render con la tienda y el dashboard. */
const blueprint = parse(readRoot('render.yaml'))

/** Dirección pública del back, a la que el dashboard le habla directo desde el navegador. */
const API_ORIGIN = 'https://api.galponmates.com.ar'

/** Un servicio del Blueprint por su nombre. */
function service(name) {
  const found = blueprint.services.find((item) => item.name === name)
  expect(found, `falta el servicio ${name}`).toBeDefined()
  return found
}

/** Las variables de un servicio como un objeto: el valor fijo, o la definición entera. */
function envOf(name) {
  return Object.fromEntries(
    service(name).envVars.map(({ key, ...rest }) => [key, 'value' in rest ? rest.value : rest]),
  )
}

describe('render.yaml: la tienda', () => {
  const store = service('galpon-mates-tienda')

  it('es un servicio de Node que compila y arranca la tienda del monorepo', () => {
    expect(store).toMatchObject({
      type: 'web',
      runtime: 'node',
      buildCommand: 'npm ci && npm run build -w @galpon/store',
      startCommand: 'npm run start -w @galpon/store',
    })
    // Sin rootDir: el monorepo necesita el package-lock.json y los paquetes de la raíz.
    expect(store.rootDir).toBeUndefined()
  })

  it('`next start` escucha en el puerto que le da la plataforma ($PORT), no en uno fijo', () => {
    const manifest = JSON.parse(readRoot('apps/store/package.json'))
    expect(manifest.scripts.start).toBe('next start')
  })

  it('arranca en el plan gratis y vive en la raíz del dominio', () => {
    expect(store.plan).toBe('free')
    expect(store.domains).toEqual(['galponmates.com.ar'])
  })

  it('habla con el back en vivo, toma la IP de True-Client-IP y los secretos del back', () => {
    const env = envOf('galpon-mates-tienda')

    expect(env).toMatchObject({
      API_MODE: 'live',
      NEXT_PUBLIC_API_MODE: 'live',
      NEXT_PUBLIC_SITE_URL: 'https://galponmates.com.ar',
      TRUSTED_CLIENT_IP_HEADER: 'true-client-ip',
      NEXT_PUBLIC_MP_PUBLIC_KEY: { sync: false },
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: { sync: false },
    })
    expect(env.API_BASE_URL).toMatch(/^https:\/\/[a-z0-9.-]+$/)
    expect(env.REVALIDATE_SECRET).toEqual({
      fromService: { type: 'web', name: 'galpon-mates-api', envVarKey: 'STORE_REVALIDATE_SECRET' },
    })
    expect(env.API_PROXY_SECRET).toEqual({
      fromService: { type: 'web', name: 'galpon-mates-api', envVarKey: 'TRUSTED_PROXY_SECRET' },
    })
  })
})

describe('render.yaml: el dashboard', () => {
  const admin = service('galpon-mates-admin')

  it('es un sitio estático con lo que compila Vite', () => {
    expect(admin).toMatchObject({
      type: 'web',
      runtime: 'static',
      buildCommand: 'npm ci && npm run build -w @galpon/admin',
      staticPublishPath: 'apps/admin/dist',
      domains: ['admin.galponmates.com.ar'],
    })
  })

  it('en vivo le habla directo al back en api.galponmates.com.ar', () => {
    expect(envOf('galpon-mates-admin')).toEqual({
      VITE_API_MODE: 'live',
      VITE_API_BASE_URL: API_ORIGIN,
      VITE_STORE_URL: 'https://galponmates.com.ar',
    })
  })

  it('manda la CSP y las cabeceras de seguridad del código del dashboard, más HSTS', () => {
    const everyPath = Object.fromEntries(
      admin.headers.filter((rule) => rule.path === '/*').map(({ name, value }) => [name, value]),
    )

    expect(everyPath).toEqual({
      'Content-Security-Policy': buildAdminCsp(API_ORIGIN),
      ...ADMIN_SECURITY_HEADERS,
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
    })
  })

  it('cualquier ruta que no sea un archivo devuelve index.html (es una SPA)', () => {
    expect(admin.routes).toEqual([{ type: 'rewrite', source: '/*', destination: '/index.html' }])
  })

  it('los archivos con hash de /assets se guardan para siempre', () => {
    expect(admin.headers.filter((rule) => rule.path === '/assets/*')).toEqual([
      {
        path: '/assets/*',
        name: 'Cache-Control',
        value: 'public, max-age=31536000, immutable',
      },
    ])
  })
})
