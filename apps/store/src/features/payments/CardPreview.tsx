import type { CSSProperties, ReactNode } from 'react'
import { PAYMENTS_COPY } from './payments.copy'

/** Props de {@link CardPreview}. */
export interface CardPreviewProps {
  /** Nombre de la marca (por ejemplo `Visa`), o `null` si todavía no se conoce. */
  brand: string | null
  /** Primeros dígitos de la tarjeta, o `null` si todavía no hay suficientes. */
  bin: string | null
  /** Nombre del titular tal como se escribe. */
  cardholderName: string
  /** Si muestra el dorso (mientras se escribe el CVC). */
  flipped: boolean
}

/** Largo del número que dibuja la tarjeta. */
const PREVIEW_DIGITS = 16

/** Relleno de los dígitos que la tienda nunca ve. */
const HIDDEN_DIGIT = '•'

/** Frente y dorso comparten la posición y ocultan su cara de atrás al girar. */
const FACE_CLASS =
  'absolute inset-0 rounded-[14px] [-webkit-backface-visibility:hidden] [backface-visibility:hidden]'

/** Frente de la tarjeta: brillo cobre arriba a la derecha sobre el degradé oscuro del diseño. */
const FRONT_STYLE: CSSProperties = {
  background:
    'radial-gradient(260px 180px at 100% 0%, color-mix(in srgb, var(--color-accent) 35%, transparent), transparent 70%), linear-gradient(135deg, var(--color-neutral-800), var(--color-background))',
  boxShadow: '0 0 0 1px var(--color-neutral-700), 0 24px 50px -20px rgba(0,0,0,.7)',
}

/** Dorso de la tarjeta. */
const BACK_STYLE: CSSProperties = {
  background: 'linear-gradient(135deg, var(--color-neutral-800), var(--color-background))',
  boxShadow: '0 0 0 1px var(--color-neutral-700)',
  transform: 'rotateY(180deg)',
}

/** El BIN seguido de `••••`, agrupado de a 4 como en la tarjeta: "4509 9535 •••• ••••". */
function maskedNumber(bin: string | null): string {
  return ((bin ?? '') + HIDDEN_DIGIT.repeat(PREVIEW_DIGITS))
    .slice(0, PREVIEW_DIGITS)
    .replace(/(.{4})(?=.)/g, '$1 ')
}

/**
 * Tarjeta animada del diseño (paso Pago): marca, el BIN seguido de `••••` y el titular; gira al
 * enfocar el CVC. El vencimiento y el CVC se muestran fijos ("MM/AA" y "•••") porque en vivo los
 * dígitos viven dentro de los iframes de Mercado Pago. Es decorativa: queda oculta para los
 * lectores de pantalla, que ya tienen los campos.
 *
 * @param props - Ver {@link CardPreviewProps}.
 */
export function CardPreview({ brand, bin, cardholderName, flipped }: CardPreviewProps): ReactNode {
  const name = cardholderName.trim()
  return (
    <div
      aria-hidden="true"
      data-card-preview=""
      data-flipped={flipped ? 'true' : 'false'}
      className="aspect-[1.586] w-[min(100%,320px)] flex-none [perspective:1200px]"
    >
      <div
        className="relative size-full transition-transform duration-[800ms] ease-[cubic-bezier(.16,1,.3,1)] [transform-style:preserve-3d] motion-reduce:transition-none"
        style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        <div className={`${FACE_CLASS} flex flex-col justify-between p-5`} style={FRONT_STYLE}>
          <div className="flex items-center justify-between">
            <span className="h-[28px] w-[38px] rounded-[6px] bg-[linear-gradient(135deg,var(--color-neutral-300),var(--color-neutral-600))]" />
            <span className="text-[12px] tracking-[.14em]">
              {brand === null ? PAYMENTS_COPY.previewBrand : brand.toLocaleUpperCase('es-AR')}
            </span>
          </div>
          <span className="text-[clamp(16px,2vw,20px)] tracking-[.12em] tabular-nums">
            {maskedNumber(bin)}
          </span>
          <div className="flex justify-between gap-3 text-[11px] tracking-[.1em]">
            <span className="truncate">
              {name === '' ? PAYMENTS_COPY.previewName : name.toLocaleUpperCase('es-AR')}
            </span>
            <span>{PAYMENTS_COPY.previewExpiration}</span>
          </div>
        </div>
        <div className={`${FACE_CLASS} overflow-hidden`} style={BACK_STYLE}>
          <div className="mt-[22px] h-10 bg-neutral-900" />
          <div className="text-background mx-5 mt-[18px] flex h-[34px] items-center justify-end rounded-[4px] bg-neutral-200 px-3 text-[14px] tracking-[.16em]">
            {PAYMENTS_COPY.previewSecurityCode}
          </div>
        </div>
      </div>
    </div>
  )
}
