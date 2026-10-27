import type { AnyRouter } from '@tanstack/react-router'
import type { RenderResult } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { render } from '@testing-library/react'
import type { AdminSession, ApiClient } from '@galpon/api-client'
import type { PersistentMockDb } from '@galpon/api-client/mock'
import { adminLogin } from '@galpon/api-client'
import { adminCsrfQuery, adminSessionQuery, ApiClientProvider } from '@galpon/api-client/react'
import type { RouterContext } from '../features/auth'
import { createAdminApi } from '../lib/api'
import { parseAdminEnv } from '../lib/env'
import { OtherScreen } from './OtherScreen'

/** Momento en que arrancan los tests: el mediodía del 27 de octubre de 2026 en Buenos Aires. */
export const TEST_NOW = new Date('2026-10-27T15:00:00Z')

/** Opciones de {@link createTestApp}. */
export interface TestAppOptions {
  /** Con `true` (por omisión) la sesión ya está iniciada, el token CSRF puesto y la caché cargada. */
  loggedIn?: boolean
  /** Con `true` (por omisión) la base trae los datos de demostración del admin. */
  demo?: boolean
  /** Reloj de la API simulada; por omisión devuelve siempre {@link TEST_NOW}. */
  now?: () => Date
}

/** Todo lo que un test necesita para montar una pantalla contra la API de prueba. */
export interface TestApp {
  /** Cliente de la API simulada, sin latencia. */
  api: ApiClient
  /** La base simulada (`mockDb.db`), para prepararla o inspeccionarla. */
  mockDb: PersistentMockDb
  /** Caché de consultas propia del test, sin reintentos. */
  queryClient: QueryClient
  /** Contexto del router, el mismo que arma `main.tsx`. */
  context: RouterContext
  /** La sesión abierta, o `null` si se creó con `loggedIn: false`. */
  session: AdminSession | null
}

/** Opciones de {@link renderWithApp}. */
export interface RenderWithAppOptions {
  /** La app del test (ver {@link createTestApp}). */
  app: TestApp
  /** Dirección inicial del router en memoria; por omisión `/`. */
  path?: string
  /**
   * Patrón de la ruta que muestra la pantalla (por ejemplo `/pedidos/$numero` para un `path`
   * `/pedidos/GLP-09001`); por omisión, el mismo `path`.
   */
  routePath?: string
}

/** Lo que devuelve {@link renderWithApp}: el resultado de `render` más el router. */
export interface RenderWithAppResult extends RenderResult {
  /** El router en memoria: `router.state.location.pathname` dice adónde navegó la pantalla. */
  router: AnyRouter
}

/**
 * Crea la API simulada, la caché y el contexto del router para un test, con la sesión iniciada.
 *
 * @param options - Ver {@link TestAppOptions}.
 * @returns Ver {@link TestApp}.
 */
export async function createTestApp(options: TestAppOptions = {}): Promise<TestApp> {
  const { loggedIn = true, demo = true, now = () => TEST_NOW } = options
  const env = parseAdminEnv({ VITE_MOCK_LATENCY_MS: '0' })
  const admin = createAdminApi(env, null, { demo, now })
  if (admin.mockDb === null) throw new Error('createTestApp solo funciona en modo de prueba.')
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const context: RouterContext = {
    queryClient,
    api: admin.api,
    apiMode: env.apiMode,
    storeUrl: env.storeUrl,
    setCsrfToken: admin.setCsrfToken,
    mockStatus: admin.mockStatus,
    registerMockImage: admin.registerMockImage,
  }
  let session: AdminSession | null = null
  if (loggedIn) {
    const login = await adminLogin(admin.api, {
      email: env.mockAdminEmail,
      password: env.mockAdminPassword,
    })
    admin.setCsrfToken(login.csrfToken)
    session = { email: login.email, expiresAt: login.expiresAt }
    queryClient.setQueryData(adminSessionQuery(admin.api).queryKey, session)
    queryClient.setQueryData(adminCsrfQuery(admin.api).queryKey, { csrfToken: login.csrfToken })
  }
  return { api: admin.api, mockDb: admin.mockDb, queryClient, context, session }
}

/**
 * Dibuja `ui` dentro de los proveedores de la app y de un router en memoria que lo muestra en
 * `path`, así los `Link` y los hooks del router funcionan. Cualquier otra dirección muestra
 * "Ruta de prueba: {pathname}", para afirmar adónde navegó la pantalla.
 *
 * Espera a que el router cargue antes de dibujar, así la pantalla aparece sin estado pendiente.
 * Si la app tiene sesión, la ruta la pone en el contexto como hace `_authenticated.tsx`.
 *
 * @param ui - La pantalla o el componente a probar.
 * @param options - Ver {@link RenderWithAppOptions}.
 * @returns Ver {@link RenderWithAppResult}.
 */
export async function renderWithApp(
  ui: ReactNode,
  options: RenderWithAppOptions,
): Promise<RenderWithAppResult> {
  const { app, path = '/', routePath = path } = options
  const rootRoute = createRootRouteWithContext<RouterContext>()({ component: Outlet })
  const screenRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: routePath,
    beforeLoad: () => (app.session === null ? {} : { session: app.session }),
    component: () => ui,
  })
  const otherRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '$',
    component: OtherScreen,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([screenRoute, otherRoute]),
    history: createMemoryHistory({ initialEntries: [path] }),
    context: app.context,
  })
  await router.load()
  const result = render(
    <ApiClientProvider client={app.api}>
      <QueryClientProvider client={app.queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ApiClientProvider>,
  )
  return { ...result, router }
}
