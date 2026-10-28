import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { AdminProductQuery } from '@galpon/api-client'
import { adminContentQuery, adminProductsQuery, useApiClient } from '@galpon/api-client/react'
import { combinedLoadState } from '../content-load-state'
import { ContentLayout } from './ContentLayout'
import { ContentLoader } from './ContentLoader'
import { HomeContentForm } from './HomeContentForm'

/** Productos que se pueden elegir para la historia: los publicados, todos en una página. */
const PUBLISHED_PRODUCTS = {
  status: 'published',
  pageSize: 100,
} as const satisfies AdminProductQuery

/**
 * Pantalla `/contenido/inicio`: los textos del inicio y los productos de la historia (elegidos
 * entre los publicados de cada grupo).
 */
export function HomeContentScreen(): ReactNode {
  const api = useApiClient()
  const content = useQuery(adminContentQuery(api, 'home'))
  const products = useQuery(adminProductsQuery(api, PUBLISHED_PRODUCTS))
  return (
    <ContentLayout>
      <ContentLoader
        state={combinedLoadState([content, products])}
        onRetry={() => {
          void content.refetch()
          void products.refetch()
        }}
      >
        {content.isSuccess && products.isSuccess && (
          <HomeContentForm content={content.data} products={products.data.items} />
        )}
      </ContentLoader>
    </ContentLayout>
  )
}
