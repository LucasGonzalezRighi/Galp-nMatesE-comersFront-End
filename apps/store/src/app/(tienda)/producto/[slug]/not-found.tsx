import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { asRoute } from '@/lib/routes'

/** Microtextos de la página de un producto que no existe (spec 9.7). */
const PRODUCT_NOT_FOUND_COPY = {
  eyebrow: 'Error 404',
  title: 'No encontramos ese producto.',
  text: 'Puede que ya no esté disponible o que la dirección haya cambiado.',
  shop: 'Volver a la tienda',
} as const

/** Una ficha que no existe no se indexa. */
export const metadata: Metadata = {
  title: 'Producto no encontrado',
  robots: { index: false, follow: false },
}

/**
 * Página que se muestra cuando `/producto/<slug>` no existe, está en borrador o el slug no es
 * válido (spec 9.7): "No encontramos ese producto." y un acceso para volver a la tienda.
 */
export default function ProductNotFound(): ReactNode {
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col items-start gap-[22px] px-[clamp(20px,5vw,64px)] pt-[clamp(72px,10vw,140px)] pb-[clamp(96px,12vw,180px)]">
      <span className="text-accent before:bg-accent flex items-center gap-3 text-[12px] tracking-[0.14em] uppercase before:h-px before:w-7 before:content-['']">
        {PRODUCT_NOT_FOUND_COPY.eyebrow}
      </span>
      <h1 className="text-[clamp(42px,6vw,84px)] leading-none tracking-[-0.035em]">
        {PRODUCT_NOT_FOUND_COPY.title}
      </h1>
      <p className="m-0 max-w-[44ch] text-[16px] leading-[1.65] text-neutral-300">
        {PRODUCT_NOT_FOUND_COPY.text}
      </p>
      <div className="mt-2">
        <Button asChild size="lg">
          <Link href={asRoute('/tienda')}>{PRODUCT_NOT_FOUND_COPY.shop}</Link>
        </Button>
      </div>
    </main>
  )
}
