'use client'

import type { ReactNode } from 'react'

/** Props de {@link OptionCard}. */
export interface OptionCardProps {
  /** Nombre del grupo de opciones (el `name` de los radios). */
  name: string
  /** Valor de esta opción. */
  value: string
  /** Si es la elegida. */
  checked: boolean
  /** Texto principal. */
  label: string
  /** Texto secundario (plazo o detalle). */
  hint: string
  /** Texto a la derecha (por ejemplo, el costo). */
  aside?: string
  /** Si no se puede elegir por ahora. */
  disabled?: boolean
  /** Se llama al elegirla. */
  onSelect: () => void
}

/**
 * Opción de envío o de pago del diseño: una tarjeta con un punto cobre que se llena al elegirla y
 * un anillo alrededor. Por dentro es un radio nativo, así se navega con las flechas y los lectores
 * de pantalla la anuncian como opción de un grupo.
 *
 * @param props - Ver {@link OptionCardProps}.
 */
export function OptionCard({
  name,
  value,
  checked,
  label,
  hint,
  aside,
  disabled = false,
  onSelect,
}: OptionCardProps): ReactNode {
  return (
    <label className="bg-surface flex cursor-pointer items-center gap-[14px] rounded-[10px] px-[18px] py-4 shadow-[0_0_0_1px_var(--color-neutral-800)] transition-shadow duration-[400ms] has-checked:shadow-[0_0_0_1.5px_var(--color-accent),0_0_24px_-12px_var(--color-accent)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--color-accent) has-disabled:cursor-not-allowed has-disabled:opacity-60 motion-reduce:transition-none">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        className="peer sr-only"
        onChange={onSelect}
      />
      <span
        aria-hidden="true"
        className="border-accent peer-checked:bg-accent size-4 flex-none rounded-full border-[1.5px] transition-all duration-300 peer-checked:shadow-[inset_0_0_0_3px_var(--color-surface)] motion-reduce:transition-none"
      />
      <span className="flex flex-1 flex-col gap-[2px]">
        <span className="text-[15px]">{label}</span>
        <span className="text-[12.5px] text-neutral-400">{hint}</span>
      </span>
      {aside === undefined ? null : <span className="text-[15px] tabular-nums">{aside}</span>}
    </label>
  )
}
