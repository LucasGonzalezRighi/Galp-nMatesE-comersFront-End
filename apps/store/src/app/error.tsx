'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'

/** Microtextos de la página de error (spec 9.7). */
const ERROR_COPY = {
  eyebrow: 'Algo salió mal',
  title: 'No pudimos cargar esta página',
  text: 'Pasó algo de nuestro lado. Probá de nuevo en un momento.',
  retry: 'Reintentar',
  home: 'Volver al inicio',
} as const

/** Props de {@link ErrorPage}, las que entrega Next.js a `error.tsx`. */
interface ErrorPageProps {
  /** El error que se produjo (con `digest` si ocurrió en el servidor). */
  error: Error & { digest?: string }
  /** Vuelve a intentar renderizar el segmento que falló. */
  reset: () => void
}

/**
 * Página de error de la tienda (spec 9.7): "No pudimos cargar esta página", con un botón para
 * reintentar y otro para volver al inicio.
 *
 * @param props - Ver {@link ErrorPageProps}.
 */
export default function ErrorPage({ reset }: ErrorPageProps): ReactNode {
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col items-start gap-[22px] px-[clamp(20px,5vw,64px)] pt-[clamp(72px,10vw,140px)] pb-[clamp(96px,12vw,180px)]">
      <span className="text-accent before:bg-accent flex items-center gap-3 text-[12px] tracking-[0.14em] uppercase before:h-px before:w-7 before:content-['']">
        {ERROR_COPY.eyebrow}
      </span>
      <h1 className="text-[clamp(42px,6vw,84px)] leading-none tracking-[-0.035em]">
        {ERROR_COPY.title}
      </h1>
      <p className="m-0 max-w-[44ch] text-[16px] leading-[1.65] text-neutral-300">
        {ERROR_COPY.text}
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <Button size="lg" onClick={reset}>
          {ERROR_COPY.retry}
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/">{ERROR_COPY.home}</Link>
        </Button>
      </div>
    </main>
  )
}
