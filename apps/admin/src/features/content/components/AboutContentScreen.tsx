import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminContentQuery, useApiClient } from '@galpon/api-client/react'
import { combinedLoadState } from '../content-load-state'
import { AboutContentForm } from './AboutContentForm'
import { ContentLayout } from './ContentLayout'
import { ContentLoader } from './ContentLoader'

/**
 * Pantalla `/contenido/nosotros`: los textos de Nosotros y los socios con su foto. Necesita un
 * `ImageUploaderProvider` más arriba (lo pone la ruta `_authenticated`).
 */
export function AboutContentScreen(): ReactNode {
  const api = useApiClient()
  const content = useQuery(adminContentQuery(api, 'about'))
  return (
    <ContentLayout>
      <ContentLoader
        state={combinedLoadState([content])}
        onRetry={() => {
          void content.refetch()
        }}
      >
        {content.data !== undefined && <AboutContentForm content={content.data} />}
      </ContentLoader>
    </ContentLayout>
  )
}
