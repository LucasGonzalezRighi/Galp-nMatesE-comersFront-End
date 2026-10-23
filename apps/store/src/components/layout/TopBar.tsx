import type { ReactNode } from 'react'
import { ArrowUUpLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowUUpLeft'
import Link from 'next/link'
import { asRoute } from '../../lib/routes'
import { LAYOUT_COPY } from './layout.copy'

/**
 * Barra superior fina de todas las páginas (spec 9.5 y 9.6, decisión D9): el link "Botón de
 * arrepentimiento" a simple vista, sin hacer scroll, en escritorio y en celular (Disposición
 * 954/2025). Lleva a `/arrepentimiento`. No es fija: al bajar se va y queda el encabezado.
 */
export function TopBar(): ReactNode {
  return (
    <div className="bg-accent-900 border-accent-800 relative z-10 border-b">
      <div className="mx-auto flex h-8 max-w-[1280px] items-center justify-center px-[clamp(20px,5vw,64px)]">
        <Link
          href={asRoute('/arrepentimiento')}
          className="text-accent-200 hover:text-accent-100 inline-flex items-center gap-[6px] text-[12px] tracking-[0.01em] no-underline underline-offset-4 hover:underline"
        >
          <ArrowUUpLeftIcon size={13} aria-hidden="true" />
          {LAYOUT_COPY.withdrawal}
        </Link>
      </div>
    </div>
  )
}
