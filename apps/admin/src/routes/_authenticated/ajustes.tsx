import { createFileRoute } from '@tanstack/react-router'

/** Ruta `/ajustes`: marcadora de P4 ("En construcción") hasta que la reemplace la Task 11. */
export const Route = createFileRoute('/_authenticated/ajustes')({
  component: SettingsPage,
})

// Marcadora de P4: la reemplaza la Task 11.
function SettingsPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4 lg:p-8">
      <h1 className="text-h3">Ajustes</h1>
      <p className="text-neutral-400">En construcción</p>
    </main>
  )
}
