import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminSettingsQuery, useApiClient } from '@galpon/api-client/react'
import { ErrorState } from '../../../components/ui/ErrorState'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Skeleton } from '../../../components/ui/Skeleton'
import { SETTINGS_COPY } from '../settings.copy'
import { SettingsForm } from './SettingsForm'

/** Tarjetas grises con la forma de las secciones del formulario, mientras carga. */
function SettingsSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        {SETTINGS_COPY.loading}
      </p>
      {[0, 1, 2].map((index) => (
        <div key={index} className="bg-surface flex flex-col gap-4 rounded-lg p-4 shadow-sm lg:p-6">
          <Skeleton className="h-6 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Pantalla `/ajustes`: carga los ajustes (`adminSettingsQuery`) y muestra `SettingsForm`, con
 * su esqueleto mientras carga y "No pudimos cargar los ajustes." con "Reintentar" si falla.
 */
export function SettingsScreen(): ReactNode {
  const api = useApiClient()
  const settings = useQuery(adminSettingsQuery(api))

  let content: ReactNode
  if (settings.isPending) content = <SettingsSkeleton />
  else if (settings.isError) {
    content = (
      <ErrorState
        title={SETTINGS_COPY.loadError}
        onRetry={() => void settings.refetch()}
        className="bg-surface rounded-lg shadow-sm"
      />
    )
  } else content = <SettingsForm settings={settings.data} />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={SETTINGS_COPY.title} />
      {content}
    </div>
  )
}
