import type { ReactNode } from 'react'
import Image from 'next/image'
import { cx } from './cx'

/** `sizes` por omisión: grilla de cuatro columnas en escritorio, dos en tabletas y una en celulares. */
const DEFAULT_SIZES = '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw'

/** Props de {@link ImageWithPlaceholder}. */
export interface ImageWithPlaceholderProps {
  /** Dirección de la imagen, o `null`/`undefined` si el producto todavía no tiene foto. */
  src?: string | null
  /** Texto alternativo: describe la imagen o, sin foto, el producto que representa la silueta. */
  alt: string
  /**
   * Anchos que ocupa la imagen según el ancho de pantalla (ver `next/image`). Por omisión, el de una
   * grilla de productos: un cuarto, la mitad o todo el ancho según la pantalla.
   */
  sizes?: string
  /** Carga la imagen con prioridad (la del primer pliegue). */
  priority?: boolean
  /** `cover` recorta para llenar el marco (por defecto); `contain` la muestra entera. */
  fit?: 'cover' | 'contain'
  /**
   * Clases del marco, que es quien define el tamaño: la imagen lo llena, así que hace falta un
   * alto (por ejemplo `aspect-[4/5]`). También sirve para el radio de las esquinas.
   */
  className?: string
}

/**
 * Imagen de producto en un marco que la recorta (`next/image` con `fill`). Sin imagen muestra la
 * silueta de un mate sobre el fondo de la tienda, así el diseño no cambia cuando falta la foto.
 *
 * @param props - Ver {@link ImageWithPlaceholderProps}.
 * @example
 * <ImageWithPlaceholder src={product.images[0]?.url} alt={product.name} className="aspect-[4/5]" />
 */
export function ImageWithPlaceholder({
  src,
  alt,
  sizes = DEFAULT_SIZES,
  priority = false,
  fit = 'cover',
  className,
}: ImageWithPlaceholderProps): ReactNode {
  const hasImage = src !== undefined && src !== null && src !== ''

  return (
    <div className={cx('bg-background relative overflow-hidden', className)}>
      {hasImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={fit === 'cover' ? 'object-cover object-[50%_72%]' : 'object-contain'}
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="flex size-full items-center justify-center text-neutral-700"
        >
          <svg viewBox="0 0 120 120" fill="currentColor" aria-hidden="true" className="size-3/5">
            {/* Virola, cuerpo de calabaza y bombilla. */}
            <path d="M26 46a4 4 0 0 1 4-4h60a4 4 0 0 1 4 4v2a4 4 0 0 1-4 4H30a4 4 0 0 1-4-4z" />
            <path d="M31 54h58c1 26-10 46-29 50-19-4-30-24-29-50z" />
            <path d="M78 8l4.5 2L68 56l-4.5-1.5z" />
          </svg>
        </div>
      )}
    </div>
  )
}
