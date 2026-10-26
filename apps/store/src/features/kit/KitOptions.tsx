'use client'

import type { ReactNode } from 'react'
import { CheckIcon } from '@phosphor-icons/react/Check'
import type { ProductGroup } from '@galpon/domain'
import { GridReplay, Tilt } from '@/components/motion'
import { ImageWithPlaceholder, Price } from '@/components/ui'
import { cx } from '@/components/ui/cx'
import type { KitProduct } from './kit-products'
import { noOptionsText, stepHint, stepTitle } from './kit.copy'

/** Props de {@link KitOptions}. */
export interface KitOptionsProps {
  /** Grupo que se está eligiendo. */
  group: ProductGroup
  /** Opciones comprables del grupo. */
  options: readonly KitProduct[]
  /** Id de la pieza elegida en este grupo, si hay. */
  selectedId: string | undefined
  /** Se llama al elegir una opción. */
  onPick: (product: KitProduct) => void
}

/** Anillo de la opción elegida: contorno cobre y un resplandor. */
const SELECTED_RING = 'shadow-[0_0_0_1px_var(--color-accent),0_0_30px_-8px_var(--color-accent)]'

/** Retraso entre una opción y la siguiente al aparecer, en milisegundos (10 ms en el diseño). */
const OPTION_STAGGER_MS = 10

/** `sizes` de la foto de una opción: unos 180 px en escritorio y casi la mitad del ancho en el celular. */
const OPTION_IMAGE_SIZES = '(min-width: 1024px) 180px, 45vw'

/**
 * Paso de elección del kit: título, ayuda y grilla de opciones comprables con un tilde en la
 * elegida. Si no hay ninguna comprable, avisa "No hay … disponibles por ahora". Al cambiar de
 * paso la grilla vuelve a aparecer escalonada.
 *
 * @param props - Ver {@link KitOptionsProps}.
 */
export function KitOptions({ group, options, selectedId, onPick }: KitOptionsProps): ReactNode {
  return (
    <div>
      <div className="mb-5 flex flex-col gap-[6px]">
        <h2 className="text-[28px] leading-[1.12] font-medium tracking-[-0.02em]">
          {stepTitle(group)}
        </h2>
        <p className="text-[14px] text-neutral-400">{stepHint(group, options.length)}</p>
      </div>
      {options.length === 0 ? (
        <p role="status" className="text-neutral-400">
          {noOptionsText(group)}
        </p>
      ) : (
        <div role="group" aria-label={stepTitle(group)}>
          <GridReplay
            replayKey={group}
            step={OPTION_STAGGER_MS}
            className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,180px),1fr))] gap-[14px]"
          >
            {options.map((product) => {
              const selected = product.id === selectedId
              return (
                <Tilt key={product.id} className="h-full">
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      onPick(product)
                    }}
                    className={cx(
                      'bg-surface relative flex h-full w-full cursor-pointer flex-col gap-[10px] rounded-[12px] border-0 px-2 pt-2 pb-3 text-left text-inherit transition-shadow duration-[400ms] motion-reduce:transition-none',
                      selected ? SELECTED_RING : 'shadow-sm',
                    )}
                  >
                    {/* La foto es decorativa: el nombre del producto va debajo, dentro del botón. */}
                    <span aria-hidden="true" className="pointer-events-none relative block">
                      <ImageWithPlaceholder
                        src={product.image?.url}
                        alt={product.image?.alt ?? product.name}
                        sizes={OPTION_IMAGE_SIZES}
                        className="aspect-square rounded-[8px]"
                      />
                      <span
                        className={cx(
                          'bg-accent text-background ease-spring absolute top-2 right-2 grid size-[26px] place-items-center rounded-full transition-[opacity,transform] duration-[400ms] motion-reduce:transition-none',
                          selected ? 'scale-100 opacity-100' : 'scale-[0.4] opacity-0',
                        )}
                      >
                        <CheckIcon size={14} weight="bold" />
                      </span>
                    </span>
                    <span className="flex flex-col gap-1 px-1">
                      <span className="text-accent text-[10.5px] tracking-[0.1em] uppercase">
                        {product.categoryName}
                      </span>
                      <span className="text-[14px] leading-[1.3]">{product.name}</span>
                      <Price amount={product.priceArs} size="sm" />
                    </span>
                  </button>
                </Tilt>
              )
            })}
          </GridReplay>
        </div>
      )}
    </div>
  )
}
