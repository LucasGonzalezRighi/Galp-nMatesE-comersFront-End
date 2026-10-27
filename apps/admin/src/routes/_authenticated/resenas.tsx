import { createFileRoute } from '@tanstack/react-router'

/** Ruta `/resenas`: marcadora de P4 ("En construcción") hasta que la reemplace la Task 9. */
export const Route = createFileRoute('/_authenticated/resenas')({
  component: ReviewsPage,
})

// Marcadora de P4: la reemplaza la Task 9.
function ReviewsPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4 lg:p-8">
      <h1 className="text-h3">Reseñas</h1>
      <p className="text-neutral-400">En construcción</p>
    </main>
  )
}
