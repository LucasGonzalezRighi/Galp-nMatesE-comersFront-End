import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminContentQuery, useApiClient } from '@galpon/api-client/react'
import { combinedLoadState } from '../content-load-state'
import { ContentLayout } from './ContentLayout'
import { ContentLoader } from './ContentLoader'
import { FaqContentForm } from './FaqContentForm'

/** Pantalla `/contenido/preguntas`: las preguntas frecuentes por categoría. */
export function FaqContentScreen(): ReactNode {
  const api = useApiClient()
  const content = useQuery(adminContentQuery(api, 'faq'))
  return (
    <ContentLayout>
      <ContentLoader
        state={combinedLoadState([content])}
        onRetry={() => {
          void content.refetch()
        }}
      >
        {content.isSuccess && <FaqContentForm content={content.data} />}
      </ContentLoader>
    </ContentLayout>
  )
}
