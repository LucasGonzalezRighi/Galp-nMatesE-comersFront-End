import { createFileRoute } from '@tanstack/react-router'

/** Ruta `/cuenta`: marcadora de P4 ("En construcción") hasta que la reemplace la Task 7. */
export const Route = createFileRoute('/_authenticated/cuenta')({
  component: AccountPage,
})

// Marcadora de P4: la reemplaza la Task 7.
function AccountPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4 lg:p-8">
      <h1 className="text-h3">Cuenta</h1>
      <p className="text-neutral-400">En construcción</p>
    </main>
  )
}
