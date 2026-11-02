import { createFileRoute } from '@tanstack/react-router'
import { DashboardScreen } from '../../features/dashboard'

/** Ruta `/`: el resumen del dashboard. */
export const Route = createFileRoute('/_authenticated/')({
  component: HomePage,
})

function HomePage() {
  const { apiMode } = Route.useRouteContext()
  return <DashboardScreen isMockMode={apiMode === 'mock'} />
}
