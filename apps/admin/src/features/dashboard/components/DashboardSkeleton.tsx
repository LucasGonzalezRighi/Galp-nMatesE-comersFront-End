import type { ReactNode } from 'react'
import { Skeleton } from '../../../components/ui/Skeleton'
import { DASHBOARD_COPY } from '../dashboard.copy'

/** Esqueleto de una tarjeta de cifra: el título y la cifra. */
function CardSkeleton(): ReactNode {
  return (
    <div className="bg-surface flex flex-col gap-3 rounded-lg p-4 shadow-sm lg:p-6">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-8 w-40" />
    </div>
  )
}

/** Esqueleto de una sección con una lista corta. */
function SectionSkeleton(): ReactNode {
  return (
    <div className="bg-surface flex flex-col gap-4 rounded-lg p-4 shadow-sm lg:p-6">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
    </div>
  )
}

/** Lo que muestra el resumen mientras carga: la forma de las tarjetas y de las dos secciones. */
export function DashboardSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        {DASHBOARD_COPY.loading}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    </div>
  )
}
