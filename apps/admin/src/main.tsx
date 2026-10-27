import '@fontsource-variable/inter'
import './styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { safeSessionStorage } from '@galpon/api-client/mock'
import { ApiClientProvider } from '@galpon/api-client/react'
import { createAdminApi } from './lib/api'
import { parseAdminEnv } from './lib/env'
import { routeTree } from './routeTree.gen'

/** Crea el router con la API, la caché de consultas y el estado del modo de prueba. */
function createAppRouter() {
  const env = parseAdminEnv(import.meta.env)
  const { api, mockStatus, setCsrfToken, registerMockImage } = createAdminApi(
    env,
    safeSessionStorage(),
  )
  const queryClient = new QueryClient()
  const router = createRouter({
    routeTree,
    context: {
      queryClient,
      api,
      apiMode: env.apiMode,
      storeUrl: env.storeUrl,
      setCsrfToken,
      mockStatus,
      registerMockImage,
    },
    defaultPreload: 'intent',
  })
  return { router, queryClient, api }
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>['router']
  }
}

const container = document.getElementById('root')
if (container === null) throw new Error('Falta el elemento #root en index.html.')
const root = createRoot(container)

try {
  const { router, queryClient, api } = createAppRouter()
  root.render(
    <StrictMode>
      <ApiClientProvider client={api}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ApiClientProvider>
    </StrictMode>,
  )
} catch (error) {
  // Una variable de entorno mal puesta (RangeError de parseAdminEnv): se muestra en pantalla.
  root.render(
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <h1>Configuración inválida</h1>
      <p role="alert" className="text-danger">
        {error instanceof Error ? error.message : 'No se pudo iniciar el dashboard.'}
      </p>
    </main>,
  )
}
