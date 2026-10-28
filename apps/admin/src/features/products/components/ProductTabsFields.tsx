import type { ReactNode } from 'react'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import type { ProductGroup } from '@galpon/api-client'
import { adminContentQuery, useApiClient } from '@galpon/api-client/react'
import type { ProductFormValues } from '../product-form-values'
import { Field } from '../../../components/ui/Field'
import { Section } from '../../../components/ui/Section'
import { Textarea } from '../../../components/ui/Textarea'
import { PRODUCT_TAB_TEXT_MAX_LENGTH } from '../products.constants'
import {
  PRODUCT_FORM_COPY,
  PRODUCT_GROUP_NAMES,
  tabsOverrideHint,
  viewGroupTextLabel,
} from '../products.copy'

/** Props de {@link ProductTabsFields}. */
export interface ProductTabsFieldsProps {
  /** `register` del formulario de producto. */
  register: UseFormRegister<ProductFormValues>
  /** Errores del formulario (`tabsOverride.materials`, `tabsOverride.care`). */
  errors: FieldErrors<ProductFormValues>
  /** Grupo de la línea elegida, o `null` si todavía no se eligió. */
  group: ProductGroup | null
}

/** Props de {@link GroupText}. */
interface GroupTextProps {
  /** Texto del desplegable ("Ver el texto de Mates"). */
  summary: string
  /** Texto del grupo, tal como lo muestra la ficha. */
  text: string
}

/** Desplegable con el texto que usa el grupo cuando el producto no tiene uno propio. */
function GroupText({ summary, text }: GroupTextProps): ReactNode {
  return (
    <details className="text-sm">
      <summary className="text-accent-400 focus-visible:outline-accent w-fit cursor-pointer rounded-sm underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">
        {summary}
      </summary>
      <p className="mt-2 whitespace-pre-line text-neutral-400">{text}</p>
    </details>
  )
}

/**
 * Sección "Pestañas de la ficha": "Materiales (texto propio)" y "Cuidado (texto propio)". Vacíos,
 * la ficha usa el texto del grupo de la línea (Contenido › Pestañas), que se puede ver en "Ver el
 * texto de {grupo}".
 *
 * @param props - Ver {@link ProductTabsFieldsProps}.
 */
export function ProductTabsFields({ register, errors, group }: ProductTabsFieldsProps): ReactNode {
  const api = useApiClient()
  const contentQuery = useQuery(adminContentQuery(api, 'product-tabs'))
  const groupName = group === null ? null : PRODUCT_GROUP_NAMES[group]
  const groupContent = group === null ? undefined : contentQuery.data?.[group]
  const hint = tabsOverrideHint(groupName)

  return (
    <Section title={PRODUCT_FORM_COPY.tabsSection}>
      <div className="flex flex-col gap-2">
        <Field
          label={PRODUCT_FORM_COPY.materials}
          hint={hint}
          error={errors.tabsOverride?.materials?.message}
        >
          {(control) => (
            <Textarea
              {...control}
              maxLength={PRODUCT_TAB_TEXT_MAX_LENGTH}
              {...register('tabsOverride.materials')}
            />
          )}
        </Field>
        {groupName !== null && groupContent !== undefined && (
          <GroupText summary={viewGroupTextLabel(groupName)} text={groupContent.materials} />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Field
          label={PRODUCT_FORM_COPY.care}
          hint={hint}
          error={errors.tabsOverride?.care?.message}
        >
          {(control) => (
            <Textarea
              {...control}
              maxLength={PRODUCT_TAB_TEXT_MAX_LENGTH}
              {...register('tabsOverride.care')}
            />
          )}
        </Field>
        {groupName !== null && groupContent !== undefined && (
          <GroupText summary={viewGroupTextLabel(groupName)} text={groupContent.care} />
        )}
      </div>
    </Section>
  )
}
