import type { ReactNode } from 'react'
import Link from 'next/link'
import { asRoute } from '@/lib/routes'

/** Microtextos de la página 404 del grupo del simulador (sin encabezado ni pie). */
const NOT_FOUND_COPY = {
  title: 'No encontramos esa página',
  text: 'El simulador de pagos solo existe en el modo de prueba.',
  home: 'Volver al inicio',
} as const

/**
 * 404 del grupo `(simulador)`: en modo vivo `/checkout/mp-simulado` llama a `notFound()` y, sin
 * este archivo, Next mostraría su página en inglés dentro del layout pelado.
 */
export default function SimulatorNotFound(): ReactNode {
  return (
    <main className="mx-auto flex min-h-screen max-w-[640px] flex-col items-start justify-center gap-4 px-6 py-16">
      <h1 className="text-[32px] leading-tight tracking-[-0.02em]">{NOT_FOUND_COPY.title}</h1>
      <p className="m-0 text-[16px] leading-[1.65] text-neutral-300">{NOT_FOUND_COPY.text}</p>
      <Link href={asRoute('/')} className="text-accent underline underline-offset-4">
        {NOT_FOUND_COPY.home}
      </Link>
    </main>
  )
}
