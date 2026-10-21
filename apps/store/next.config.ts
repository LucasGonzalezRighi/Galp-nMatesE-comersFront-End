import type { NextConfig } from 'next'
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants'
import { buildContentSecurityPolicy } from './src/lib/csp'
import { parseStoreEnv } from './src/lib/env'

/**
 * Configuración de Next.js de la tienda.
 *
 * Valida el entorno al cargarse, así una configuración incoherente (por ejemplo `API_MODE=live`
 * sin `API_BASE_URL`) hace fallar `dev`, `build`, `start` y `typegen` con un mensaje en español, en
 * lugar de compilar una tienda que apunta al mock. Los `rewrites` y las cabeceras se fijan en el
 * build: `API_MODE` tiene que estar definido al compilar.
 *
 * @param phase - Fase de Next.js que carga la configuración.
 * @throws {EnvError} Si el entorno no es válido.
 */
export default function nextConfig(phase: string): NextConfig {
  const env = parseStoreEnv(process.env)
  const isDev = phase === PHASE_DEVELOPMENT_SERVER
  const contentSecurityPolicy = buildContentSecurityPolicy({ isDev, apiOrigin: env.apiBaseUrl })

  return {
    cacheComponents: true,
    partialPrefetching: true,
    typedRoutes: true,
    agentRules: false,
    turbopack: {
      rules: { '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' } },
    },
    rewrites() {
      const destination =
        env.apiMode === 'mock' ? '/api/mock/v1/:path*' : `${env.apiBaseUrl ?? ''}/api/v1/:path*`
      return Promise.resolve([{ source: '/api/v1/:path*', destination }])
    },
    headers() {
      return Promise.resolve([
        {
          source: '/(.*)',
          headers: [
            { key: 'Content-Security-Policy', value: contentSecurityPolicy },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
            {
              key: 'Permissions-Policy',
              value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
            },
          ],
        },
      ])
    },
  }
}
