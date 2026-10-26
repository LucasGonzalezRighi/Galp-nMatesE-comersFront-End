import type { ReactNode } from 'react'
import type { ProductSummary } from '@galpon/api-client'
import { Float } from '../../components/motion'
import { ImageWithPlaceholder } from '../../components/ui'
import { cx } from '../../components/ui/cx'

/** Props de {@link StoryVisual}. */
export interface StoryVisualProps {
  /** El producto cuya foto se muestra; sin foto no se dibuja nada. */
  product: ProductSummary | null
  /** De qué lado de la escena va la foto (el texto va del otro). */
  side: 'left' | 'right'
  /** Es la foto principal de la portada: lleva su texto alternativo y carga con prioridad. */
  hero?: boolean
  /** Si también se muestra en celulares (más chica y tenue, detrás del texto). Por omisión solo desde 1024 px. */
  onMobile?: boolean
  /** Para que no se mueva al unísono con otras fotos: retardo del vaivén, en milisegundos. */
  floatDelay?: number
}

/** Distancia al borde de la pantalla de cada lado. */
const SIDE_CLASSES = {
  left: 'left-[clamp(20px,7vw,120px)]',
  right: 'right-[clamp(20px,7vw,120px)]',
} as const

/**
 * Foto del producto de una escena de la historia, flotando al costado del texto. Reemplaza al
 * mate 3D del diseño, que llega en P5. Sin foto no dibuja nada (no se muestra una silueta en
 * medio de la historia). Las fotos que no son la de la portada son decorativas: se ocultan a los
 * lectores de pantalla porque el producto ya está en el texto de la escena.
 *
 * @param props - Ver {@link StoryVisualProps}.
 */
export function StoryVisual({
  product,
  side,
  hero = false,
  onMobile = false,
  floatDelay = 0,
}: StoryVisualProps): ReactNode {
  const image = product?.mainImage
  if (image === null || image === undefined) return null
  return (
    <div
      aria-hidden={hero ? undefined : true}
      className={cx(
        'pointer-events-none absolute top-1/2 -translate-y-1/2',
        SIDE_CLASSES[side],
        onMobile ? 'opacity-30 lg:opacity-100' : 'hidden lg:block',
      )}
    >
      <Float delay={floatDelay}>
        <ImageWithPlaceholder
          src={image.url}
          alt={hero ? image.alt : ''}
          priority={hero}
          sizes="(min-width: 1024px) 30vw, 62vw"
          className="aspect-[4/5] w-[min(62vw,300px)] rounded-[14px] shadow-lg lg:w-[min(30vw,420px)]"
        />
      </Float>
    </div>
  )
}
