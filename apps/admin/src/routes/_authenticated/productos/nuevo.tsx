import { createFileRoute } from '@tanstack/react-router'

/** Ruta `/productos/nuevo`: marcadora de P4 ("En construcción") hasta que la reemplace la Task 10. */
export const Route = createFileRoute('/_authenticated/productos/nuevo')({
  component: NewProductPage,
})

// Marcadora de P4: la reemplaza la Task 10.
function NewProductPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4 lg:p-8">
      <h1 className="text-h3">Nuevo producto</h1>
      <p className="text-neutral-400">En construcción</p>
    </main>
  )
}
