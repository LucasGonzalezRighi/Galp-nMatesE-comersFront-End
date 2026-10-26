'use client'

import type { CSSProperties, ReactNode } from 'react'
import { CaretLeftIcon } from '@phosphor-icons/react/CaretLeft'
import { CaretRightIcon } from '@phosphor-icons/react/CaretRight'
import { useState } from 'react'
import type { Image as ProductImage } from '@galpon/api-client'
import { Tilt } from '../../components/motion'
import { IconButton, ImageWithPlaceholder } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { PRODUCT_COPY, photoPlaceholder } from './product.copy'

/** Props de {@link ProductGallery}. */
export interface ProductGalleryProps {
  /** Nombre del producto: texto alternativo y texto del marco cuando no hay fotos. */
  productName: string
  /** Código del producto (por ejemplo "N°07"), arriba a la izquierda de la foto. */
  code: string
  /** Fotos del producto, en el orden en que se muestran; puede estar vacía. */
  images: readonly ProductImage[]
}

/** `sizes` de la foto: la mitad del ancho en escritorio y todo el ancho en el celular. */
const GALLERY_SIZES = '(min-width: 1024px) 50vw, 100vw'

/** La foto se acerca hasta 1,9 veces siguiendo al mouse (las variables las publica `Tilt`). */
const ZOOM_STYLE: CSSProperties = {
  transformOrigin: 'var(--mx, 50%) var(--my, 50%)',
  transform: 'scale(calc(1 + var(--hov, 0) * .9))',
  transition: 'transform .5s cubic-bezier(.2,.8,.2,1)',
}

/** Botón de flecha: círculo de vidrio sobre la foto. */
const ARROW_CLASS = 'bg-background/70! absolute bottom-3 rounded-full! backdrop-blur-[8px]'

/** Número con dos dígitos ("01"). */
function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Galería de la ficha (spec 9.5): la foto principal en un marco 4:5 con el código y "01 / 03",
 * flechas y miniaturas numeradas si hay más de una foto, y acercamiento con el mouse. Sin fotos
 * muestra el marco punteado con "Foto 1 · nombre".
 *
 * @param props - Ver {@link ProductGalleryProps}.
 */
export function ProductGallery({ productName, code, images }: ProductGalleryProps): ReactNode {
  const [index, setIndex] = useState(0)
  const count = images.length
  const multiple = count > 1
  const current = images[index]
  const go = (next: number): void => {
    setIndex((next + count) % count)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-surface relative aspect-[4/5] overflow-hidden rounded-[14px] shadow-sm">
        <Tilt max={0} className="size-full">
          <div className="size-full cursor-zoom-in" style={ZOOM_STYLE}>
            <ImageWithPlaceholder
              key={current?.url ?? 'placeholder'}
              src={current?.url}
              alt={current?.alt ?? productName}
              label={photoPlaceholder(index + 1, productName)}
              sizes={GALLERY_SIZES}
              priority={index === 0}
              className="size-full rounded-[14px]"
            />
          </div>
        </Tilt>
        <div className="pointer-events-none absolute inset-x-4 top-[14px] flex justify-between text-[11px] tracking-[0.12em] text-neutral-300 uppercase tabular-nums">
          <span>{code}</span>
          <span>{`${twoDigits(index + 1)} / ${twoDigits(Math.max(count, 1))}`}</span>
        </div>
        {multiple ? (
          <>
            <IconButton
              aria-label={PRODUCT_COPY.previousPhoto}
              className={cx(ARROW_CLASS, 'left-3')}
              onClick={() => {
                go(index - 1)
              }}
            >
              <CaretLeftIcon size={16} aria-hidden="true" />
            </IconButton>
            <IconButton
              aria-label={PRODUCT_COPY.nextPhoto}
              className={cx(ARROW_CLASS, 'left-14')}
              onClick={() => {
                go(index + 1)
              }}
            >
              <CaretRightIcon size={16} aria-hidden="true" />
            </IconButton>
          </>
        ) : null}
      </div>
      {multiple ? (
        <div className="flex gap-2">
          {images.map((image, position) => {
            const active = position === index
            return (
              <button
                key={`${image.publicId}:${String(position)}`}
                type="button"
                aria-label={`${PRODUCT_COPY.showPhoto} ${String(position + 1)}`}
                aria-current={active ? 'true' : undefined}
                className={cx(
                  'focus-visible:outline-accent flex flex-1 cursor-pointer flex-col gap-2 border-0 bg-transparent py-[6px] text-left text-[11px] tabular-nums focus-visible:outline-2',
                  active ? 'text-foreground' : 'text-neutral-500',
                )}
                onClick={() => {
                  setIndex(position)
                }}
              >
                <span
                  aria-hidden="true"
                  className={cx(
                    'h-[2px] w-full transition-colors duration-[400ms]',
                    active ? 'bg-accent' : 'bg-neutral-800',
                  )}
                />
                {twoDigits(position + 1)}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
