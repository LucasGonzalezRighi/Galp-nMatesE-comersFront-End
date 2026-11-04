import type { ReactNode } from 'react'
import type { Control, FieldErrors } from 'react-hook-form'
import { useId } from 'react'
import { Controller } from 'react-hook-form'
import type { Leather } from '@galpon/domain'
import { tokens } from '@galpon/design-tokens'
import { LEATHERS } from '@galpon/domain'
import type { ProductFormOutput, ProductFormValues } from '../product-form-values'
import { Checkbox } from '../../../components/ui/Checkbox'
import { Section } from '../../../components/ui/Section'
import { PRODUCT_FORM_COPY } from '../products.copy'

/** Props de {@link ProductLeathersFields}. */
export interface ProductLeathersFieldsProps {
  /** `control` del formulario de producto. */
  control: Control<ProductFormValues, unknown, ProductFormOutput>
  /** Errores del formulario (`leathers` o `leathers.N`, de la validación o de un `422`). */
  errors: FieldErrors<ProductFormValues>
}

/** Props de {@link LeatherLabel}. */
interface LeatherLabelProps {
  /** Cuero que nombra. */
  leather: Leather
}

/** Nombre de un cuero con su muestra de color (la de la interfaz de la tienda). */
function LeatherLabel({ leather }: LeatherLabelProps): ReactNode {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="size-4 shrink-0 rounded-full ring-1 ring-neutral-600"
        style={{ backgroundColor: tokens.leathersUi[leather] }}
      />
      {leather}
    </span>
  )
}

/**
 * Primer mensaje de error de los cueros: el de la lista entera (`leathers`) o el de alguno de
 * ellos (`leathers.N`), o `undefined` si no hay.
 */
function leathersErrorMessage(errors: FieldErrors<ProductFormValues>): string | undefined {
  const error = errors.leathers
  if (error === undefined) return undefined
  if (error.message !== undefined && error.message !== '') return error.message
  for (let index = 0; index < LEATHERS.length; index += 1) {
    const message = error[index]?.message
    if (message !== undefined && message !== '') return message
  }
  return undefined
}

/**
 * Sección "Cueros" del formulario de producto, para los mates: cuatro casillas en el orden de
 * `LEATHERS`, cada una con su muestra de `tokens.leathersUi`, dentro de un `fieldset` con
 * `legend` solo para lectores de pantalla. Lo marcado queda siempre en ese orden. El error de
 * `leathers` (o de un `leathers.N` de un `422`) se ve debajo de las casillas y las marca
 * inválidas; con `shouldFocus`, el foco va a la primera.
 *
 * @param props - Ver {@link ProductLeathersFieldsProps}.
 */
export function ProductLeathersFields({ control, errors }: ProductLeathersFieldsProps): ReactNode {
  const errorId = useId()
  const error = leathersErrorMessage(errors)
  const describedBy = error === undefined ? undefined : errorId

  return (
    <Section title={PRODUCT_FORM_COPY.leathersSection} description={PRODUCT_FORM_COPY.leathersHint}>
      <Controller
        control={control}
        name="leathers"
        render={({ field }) => (
          <fieldset aria-describedby={describedBy} className="flex min-w-0 flex-col gap-1.5">
            <legend className="sr-only">{PRODUCT_FORM_COPY.leathersLegend}</legend>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {LEATHERS.map((leather, index) => (
                <Checkbox
                  key={leather}
                  ref={index === 0 ? field.ref : undefined}
                  name={field.name}
                  value={leather}
                  checked={field.value.includes(leather)}
                  aria-invalid={error === undefined ? undefined : true}
                  aria-describedby={describedBy}
                  onBlur={field.onBlur}
                  onChange={(event) => {
                    const checked = event.target.checked
                    field.onChange(
                      LEATHERS.filter((item) =>
                        item === leather ? checked : field.value.includes(item),
                      ),
                    )
                  }}
                  label={<LeatherLabel leather={leather} />}
                />
              ))}
            </div>
            {error !== undefined && (
              <p id={errorId} className="text-danger text-xs">
                {error}
              </p>
            )}
          </fieldset>
        )}
      />
    </Section>
  )
}
