import type { ReactNode } from 'react'
import Link from 'next/link'

/** Página que se muestra cuando la dirección no existe. */
export default function NotFound(): ReactNode {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1>No encontramos esa página</h1>
      <p>
        La dirección que buscás no existe o cambió. <Link href="/">Volver al inicio</Link>
      </p>
    </main>
  )
}
