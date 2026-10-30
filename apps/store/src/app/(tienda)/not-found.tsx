import type { ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { asRoute } from '@/lib/routes'

/** Microtextos de la página que se muestra cuando la dirección no existe. */
const NOT_FOUND_COPY = {
  eyebrow: 'Error 404',
  title: 'No encontramos esa página',
  text: 'La dirección que buscás no existe o cambió.',
  home: 'Volver al inicio',
  shop: 'Ir a la tienda',
} as const

/** Página que se muestra cuando la dirección no existe ("No encontramos esa página"). */
export default function NotFound(): ReactNode {
  return (
    <main className="site-container flex flex-col items-start gap-[22px] pt-[clamp(72px,10vw,140px)] pb-[clamp(96px,12vw,180px)]">
      <span className="text-accent before:bg-accent flex items-center gap-3 text-[12px] tracking-[0.14em] uppercase before:h-px before:w-7 before:content-['']">
        {NOT_FOUND_COPY.eyebrow}
      </span>
      <h1 className="text-[clamp(42px,6vw,84px)] leading-none tracking-[-0.035em]">
        {NOT_FOUND_COPY.title}
      </h1>
      <p className="m-0 max-w-[44ch] text-[16px] leading-[1.65] text-neutral-300">
        {NOT_FOUND_COPY.text}
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/">{NOT_FOUND_COPY.home}</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href={asRoute('/tienda')}>{NOT_FOUND_COPY.shop}</Link>
        </Button>
      </div>
    </main>
  )
}
