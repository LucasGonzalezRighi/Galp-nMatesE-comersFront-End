'use client'

import type { MotionValue } from 'motion/react'
import type { ReactNode, Ref } from 'react'
import { useMotionValueEvent, useScroll } from 'motion/react'
import { useRef, useState } from 'react'
import { tokens } from '@galpon/design-tokens'
import { LEATHERS } from '@galpon/domain'
import { cx } from '../../components/ui/cx'
import { leatherIndexForProgress } from './leather-scroll'

/** Anillo del cuero destacado: un aro del color del fondo claro y otro más fino del fondo oscuro. */
const SELECTED_RING =
  'scale-[1.18] shadow-[0_0_0_3px_var(--color-neutral-100),0_0_0_4px_var(--color-background)]'

/** Props de {@link LeatherSwatches}. */
interface LeatherSwatchesProps {
  /** Avance de 0 a 1 que elige el cuero destacado. */
  progress: MotionValue<number>
  /** Referencia al contenedor (la usa el scroll propio para medirse). */
  ref?: Ref<HTMLDivElement>
}

/** Los círculos de los cueros, con el destacado según `progress`. */
function LeatherSwatches({ progress, ref }: LeatherSwatchesProps): ReactNode {
  const [selected, setSelected] = useState(() =>
    leatherIndexForProgress(progress.get(), LEATHERS.length),
  )
  useMotionValueEvent(progress, 'change', (value) => {
    setSelected(leatherIndexForProgress(value, LEATHERS.length))
  })
  return (
    <div ref={ref} aria-hidden="true" className="flex items-center gap-[14px]">
      {LEATHERS.map((leather, position) => (
        <span
          key={leather}
          data-selected={position === selected ? 'true' : undefined}
          className={cx(
            'ease-spring size-[34px] rounded-full transition-[box-shadow,transform] duration-[400ms] motion-reduce:transition-none',
            position === selected && SELECTED_RING,
          )}
          style={{ backgroundColor: tokens.leathers3d[leather] }}
        />
      ))}
      <span className="text-background/70 ml-[6px] text-[14px]">{LEATHERS[selected]}</span>
    </div>
  )
}

/** Los cueros con su propio scroll: cada tramo del paso de la escena por la pantalla, uno. */
function ScrollLeatherPicker(): ReactNode {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 35%'] })
  return <LeatherSwatches ref={ref} progress={scrollYProgress} />
}

/** Props de {@link LeatherPicker}. */
export interface LeatherPickerProps {
  /**
   * Avance de 0 a 1 que elige el cuero destacado. Lo pasa el paseo del mate (el avance de su
   * parada quieta), donde la escena no se mueve con el scroll. Sin él, se usa el paso de la
   * escena por la pantalla.
   */
  progress?: MotionValue<number>
}

/**
 * Los cuatro cueros como círculos de color con el nombre del destacado al lado. El destacado
 * cambia con el scroll (cada tramo, uno), como en el diseño. Es una ilustración: el texto de la
 * escena ya nombra los cuatro cueros, así que se oculta a los lectores de pantalla. Con
 * `prefers-reduced-motion: reduce` el anillo cambia sin animar.
 *
 * @param props - Ver {@link LeatherPickerProps}.
 */
export function LeatherPicker({ progress }: LeatherPickerProps): ReactNode {
  return progress === undefined ? <ScrollLeatherPicker /> : <LeatherSwatches progress={progress} />
}
