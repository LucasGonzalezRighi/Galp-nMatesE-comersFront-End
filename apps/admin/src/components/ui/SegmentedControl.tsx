import type { ReactNode } from 'react'
import { useId } from 'react'
import { cx } from './cx'

/** Una opción de {@link SegmentedControl}. */
export interface SegmentedOption<T extends string> {
  /** Valor que recibe `onChange`. */
  value: T
  /** Texto visible. */
  label: string
}

/** Props de {@link SegmentedControl}. */
export interface SegmentedControlProps<T extends string> {
  /** Nombre del grupo (la leyenda, 12 px al 70 %). */
  label: string
  /** Opciones, en el orden en que se muestran. Los valores no se repiten. */
  options: readonly SegmentedOption<T>[]
  /** Valor elegido. */
  value: T
  /** Se llama con el valor de la opción que se elige. */
  onChange: (value: T) => void
  /** Clases extra del contenedor, para la disposición. */
  className?: string
}

/**
 * Selector de pocas opciones excluyentes con el estilo `.seg` del diseño: opciones de 13 px
 * pegadas, con borde `divider` y la elegida en `accent`.
 *
 * Es un grupo de radios nativos dentro de un `fieldset`, así se recorre con las flechas.
 *
 * @param props - Ver {@link SegmentedControlProps}.
 * @throws {RangeError} Si no hay opciones o dos tienen el mismo valor.
 * @example
 * <SegmentedControl label="Estado" options={statusOptions} value={status} onChange={setStatus} />
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>): ReactNode {
  const name = useId()
  if (options.length === 0) {
    throw new RangeError('El selector necesita al menos una opción.')
  }
  if (new Set(options.map((option) => option.value)).size !== options.length) {
    throw new RangeError('Las opciones del selector no pueden tener valores repetidos.')
  }
  return (
    <fieldset className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      <legend className="text-foreground/70 mb-1.5 text-xs">{label}</legend>
      <div className="border-divider divide-divider inline-flex divide-x self-start overflow-hidden rounded-md border">
        {options.map((option) => (
          <label
            key={option.value}
            className="text-foreground hover:bg-foreground/10 has-checked:text-accent has-checked:inset-ring-accent has-focus-visible:outline-accent inline-flex min-h-9 cursor-pointer items-center gap-1.5 px-3 py-[7px] text-[13px] transition-colors has-checked:inset-ring has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 motion-reduce:transition-none"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => {
                onChange(option.value)
              }}
              className="pointer-events-none absolute size-0 opacity-0"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
