'use client'

import type { ReactNode } from 'react'
import type { InstallmentOption } from '@galpon/api-client'
import { Field, Select } from '@/components/ui'
import { formatPercentAr, formatPesos, pesos } from '@galpon/domain'
import { PAYMENTS_COPY } from './payments.copy'

/** Props de {@link InstallmentsSelect}. */
export interface InstallmentsSelectProps {
  /** Opciones que devolvió `getInstallments`, o `null` mientras no se conoce la tarjeta. */
  options: readonly InstallmentOption[] | null
  /** Cantidad de cuotas elegida. */
  value: number
  /** Recibe la cantidad de cuotas que se elige. */
  onChange: (installments: number) => void
  /** Identificador del selector. Por defecto se genera uno. */
  id?: string
  /** Clases extra del contenedor. */
  className?: string
}

/** "CFT 45,90 %" de una opción. */
function cftText(option: InstallmentOption): string {
  return `${PAYMENTS_COPY.cft} ${formatPercentAr(option.cftPercent)}`
}

/** "(TEA 38,00 %)" de una opción. */
function teaText(option: InstallmentOption): string {
  return `(${PAYMENTS_COPY.tea} ${formatPercentAr(option.teaPercent)})`
}

/**
 * Arma el texto de una opción de cuotas con los números que manda el back (spec 14.4): nunca
 * recalcula la cuota ni el total. Solo dice "sin interés" si el CFT es 0.
 *
 * @param option - Opción de `getInstallments`.
 * @returns Por ejemplo "1 pago de $68.397", "3 cuotas sin interés de $22.799 · CFT 0,00 % (TEA
 * 0,00 %)" o "6 cuotas de $13.314 · Total $79.884 · CFT 45,90 % (TEA 38,00 %)".
 * @throws {RangeError} Si la cantidad de cuotas no es un entero desde 1, o un monto o porcentaje no
 * es válido.
 */
export function installmentOptionLabel(option: InstallmentOption): string {
  const count = option.installments
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(
      `La cantidad de cuotas tiene que ser un entero mayor o igual a 1; se recibió ${String(count)}.`,
    )
  }
  const amount = formatPesos(pesos(option.installmentAmountArs))
  if (count === 1) return `${PAYMENTS_COPY.onePayment} ${amount}`
  const { separator } = PAYMENTS_COPY
  const costs = `${cftText(option)} ${teaText(option)}`
  if (option.cftPercent === 0) {
    return `${String(count)} ${PAYMENTS_COPY.installmentsWord} ${PAYMENTS_COPY.withoutInterest} ${amount} ${separator} ${costs}`
  }
  const total = formatPesos(pesos(option.totalArs))
  return `${String(count)} ${PAYMENTS_COPY.installmentsWord} ${PAYMENTS_COPY.of} ${amount} ${separator} ${PAYMENTS_COPY.total} ${total} ${separator} ${costs}`
}

/**
 * Selector de cuotas del pago con tarjeta. Las opciones vienen del back (`getInstallments`) y se
 * muestran con {@link installmentOptionLabel}; debajo, la opción elegida repite el costo con el CFT
 * destacado en letra mayor que la TEA (Res. SIyC 4/2025, spec 14.4). Sin opciones queda
 * deshabilitado con "Ingresá la tarjeta para ver las cuotas".
 *
 * @param props - Ver {@link InstallmentsSelectProps}.
 */
export function InstallmentsSelect({
  options,
  value,
  onChange,
  id,
  className,
}: InstallmentsSelectProps): ReactNode {
  const selected = options?.find((option) => option.installments === value) ?? null
  return (
    <div className={className}>
      <Field label={PAYMENTS_COPY.installments} id={id}>
        {(control) =>
          options === null ? (
            <Select {...control} value="" disabled>
              <option value="">{PAYMENTS_COPY.installmentsPending}</option>
            </Select>
          ) : (
            <Select
              {...control}
              value={String(value)}
              onChange={(event) => {
                onChange(Number(event.target.value))
              }}
            >
              {options.map((option) => (
                <option key={option.installments} value={String(option.installments)}>
                  {installmentOptionLabel(option)}
                </option>
              ))}
            </Select>
          )
        }
      </Field>
      {selected === null || selected.installments === 1 ? null : (
        <p className="mt-[6px] text-[12px] text-neutral-300 tabular-nums">
          <strong className="text-foreground text-[14px] font-medium">{cftText(selected)}</strong>{' '}
          <small className="text-[11px] text-neutral-400">{teaText(selected)}</small>
        </p>
      )}
    </div>
  )
}
