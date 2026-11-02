import type { ReactNode } from 'react'
import { ImageIcon } from '@phosphor-icons/react/dist/ssr/Image'
import Image from 'next/image'
import { cx } from './cx'

/** `sizes` por omisión: grilla de cuatro columnas en escritorio, dos en tabletas y una en celulares. */
const DEFAULT_SIZES = '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw'

/** Props de {@link ImageWithPlaceholder}. */
export interface ImageWithPlaceholderProps {
  /** Dirección de la imagen, o `null`/`undefined` si el producto todavía no tiene foto. */
  src?: string | null
  /** Texto alternativo: describe la imagen o, sin foto, el producto que representa el marco vacío. */
  alt: string
  /**
   * Texto que se escribe bajo el ícono cuando no hay foto, como en el diseño (por ejemplo el nombre
   * del producto o "Foto 1 · Mate Galleta"). Sin él, el marco vacío solo muestra el ícono. Es
   * visual: lo que anuncian los lectores de pantalla es `alt`.
   */
  label?: string
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
   * alto (por ejemplo `aspect-[4/5]`). También sirve para el radio de las esquinas, que el borde
   * punteado del marco vacío copia. El marco no pinta fondo: lo pone quien lo contiene.
   */
  className?: string
}

/**
 * Imagen de producto en un marco que la recorta (`next/image` con `fill`). Sin imagen dibuja lo que
 * el diseño llama "foto pendiente": un marco de borde punteado con un ícono de imagen y, si se
 * pasa `label`, el texto debajo.
 *
 * @param props - Ver {@link ImageWithPlaceholderProps}.
 * @example
 * <ImageWithPlaceholder src={product.images[0]?.url} alt={product.name} className="aspect-[4/5]" />
 */
export function ImageWithPlaceholder({
  src,
  alt,
  label,
  sizes = DEFAULT_SIZES,
  priority = false,
  fit = 'cover',
  className,
}: ImageWithPlaceholderProps): ReactNode {
  const hasImage = src !== undefined && src !== null && src !== ''

  return (
    <div className={cx('relative overflow-hidden', className)}>
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
          className="flex size-full flex-col items-center justify-center gap-2 rounded-[inherit] border border-dashed border-neutral-700 px-3 text-center text-[13px] text-neutral-500"
        >
          <ImageIcon size={22} aria-hidden="true" />
          {label}
        </div>
      )}
    </div>
  )
}
