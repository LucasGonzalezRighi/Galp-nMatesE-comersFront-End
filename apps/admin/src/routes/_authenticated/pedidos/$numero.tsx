import { createFileRoute } from '@tanstack/react-router'

/** Ruta `/pedidos/$numero`: marcadora de P4 ("En construcción") hasta que la reemplace la Task 8. */
export const Route = createFileRoute('/_authenticated/pedidos/$numero')({
  component: OrderPage,
})

// Marcadora de P4: la reemplaza la Task 8.
function OrderPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4 lg:p-8">
      <h1 className="text-h3">Pedido</h1>
      <p className="text-neutral-400">En construcción</p>
    </main>
  )
}
