import type { ReactNode } from 'react'
import { ImageIcon } from '@phosphor-icons/react'
import type { Image } from '@galpon/api-client'

/** Props de {@link ProductThumb}. */
export interface ProductThumbProps {
  /** Foto principal del producto, o `null` si no tiene. */
  image: Image | null
}

/**
 * Miniatura de 40 × 40 de la tabla de productos: la foto principal o, sin foto, el ícono `Image`
 * en un cuadro `neutral-900`. Es decorativa: el nombre del producto va en la celda de al lado.
 *
 * @param props - Ver {@link ProductThumbProps}.
 */
export function ProductThumb({ image }: ProductThumbProps): ReactNode {
  if (image === null) {
    return (
      <span className="grid size-10 place-items-center rounded-md bg-neutral-900 text-neutral-400">
        <ImageIcon size={18} weight="regular" aria-hidden="true" />
      </span>
    )
  }
  return (
    <img
      src={image.url}
      alt=""
      width={40}
      height={40}
      loading="lazy"
      className="size-10 rounded-md object-cover"
    />
  )
}
