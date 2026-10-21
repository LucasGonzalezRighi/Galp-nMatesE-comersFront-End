'use client'

import type { ReactNode } from 'react'
import { useId } from 'react'
import { cx } from './cx'

/** Opción de {@link Segmented}. */
export interface SegmentedOption<T extends string> {
  /** Valor que se informa en `onChange` al elegir la opción. */
  value: T
  /** Texto de la opción. */
  label: ReactNode
  /** Si está deshabilitada, no se puede elegir. */
  disabled?: boolean
}

/** Props de {@link Segmented}. */
export interface SegmentedProps<T extends string> {
  /** Nombre accesible del grupo (por ejemplo "Virola"). */
  label: string
  /** Opciones, en el orden en que se muestran. */
  options: readonly SegmentedOption<T>[]
  /** Valor elegido ahora (componente controlado). */
  value: T
  /** Se llama con el valor de la opción elegida. */
  onChange: (value: T) => void
  /** Nombre de los radios. Por defecto se genera uno. */
  name?: string
  /** Clases extra del contenedor. */
  className?: string
}

/**
 * Control segmentado (`.seg` del diseño) hecho con radios nativos: un grupo de opciones donde
 * se elige una, con las flechas del teclado, foco visible y anuncio como grupo de radios.
 *
 * @param props - Ver {@link SegmentedProps}.
 * @example
 * <Segmented label="Virola" options={options} value={ferrule} onChange={setFerrule} />
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  name,
  className,
}: SegmentedProps<T>): ReactNode {
  const generatedName = useId()
  const groupName = name ?? generatedName

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('border-divider inline-flex overflow-hidden rounded-md border', className)}
    >
      {options.map((option, index) => (
        <label
          key={option.value}
          className={cx(
            'relative inline-flex cursor-pointer items-center gap-[6px] px-[12px] py-[7px] text-[13px]',
            index > 0 && 'border-divider border-l',
            'has-checked:text-accent has-checked:shadow-[inset_0_0_0_1px_var(--color-accent)]',
            'not-has-checked:hover:bg-foreground/7',
            'has-[input:focus-visible]:outline-accent has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-2',
            'has-disabled:cursor-not-allowed has-disabled:opacity-45',
          )}
        >
          <input
            type="radio"
            name={groupName}
            value={option.value}
            checked={option.value === value}
            disabled={option.disabled}
            onChange={() => {
              onChange(option.value)
            }}
            className="pointer-events-none absolute size-0 opacity-0"
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  )
}
