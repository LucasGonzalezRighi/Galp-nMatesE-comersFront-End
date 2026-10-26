'use client'

import type { ReactNode } from 'react'
import { useMotionValueEvent, useScroll } from 'motion/react'
import { useRef, useState } from 'react'
import { tokens } from '@galpon/design-tokens'
import { LEATHERS } from '@galpon/domain'
import { cx } from '../../components/ui/cx'
import { leatherIndexForProgress } from './leather-scroll'

/** Anillo del cuero destacado: un aro del color del fondo claro y otro más fino del fondo oscuro. */
const SELECTED_RING =
  'scale-[1.18] shadow-[0_0_0_3px_var(--color-neutral-100),0_0_0_4px_var(--color-background)]'

/**
 * Los cuatro cueros como círculos de color con el nombre del destacado al lado. El destacado
 * cambia con el scroll (cada tramo de la escena, uno), como en el diseño. Es una ilustración: el
 * texto de la escena ya nombra los cuatro cueros, así que se oculta a los lectores de pantalla.
 * Con `prefers-reduced-motion: reduce` el anillo cambia sin animar.
 */
export function LeatherPicker(): ReactNode {
  const ref = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 35%'] })
  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    setSelected(leatherIndexForProgress(progress, LEATHERS.length))
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
