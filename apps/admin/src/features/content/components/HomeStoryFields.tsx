import type { ReactNode } from 'react'
import type { StoryScene } from '@galpon/api-client'
import type { HomeContentFormInput } from '@galpon/schemas'
import { Section } from '../../../components/ui/Section'
import { CONTENT_COPY } from '../content.copy'
import { fieldIndex } from '../list-utils'
import { FieldGroup } from './FieldGroup'
import { TextField } from './TextField'
import { TitleLinesField } from './TitleLinesField'

/** Campo de texto del formulario del inicio. */
const HomeText = TextField<HomeContentFormInput>

/** Líneas del título del formulario del inicio. */
const HomeTitleLines = TitleLinesField<HomeContentFormInput>

/** Props de {@link HomeStoryFields}. */
export interface HomeStoryFieldsProps {
  /** Escena de cada lugar, en el orden guardado (las 6, cada una una vez). */
  sceneKeys: readonly StoryScene['key'][]
}

/**
 * Sección "Historia" del formulario del inicio: las 6 escenas fijas, cada una con su nombre
 * ("Las piezas", "La calabaza"…), antetítulo, título en líneas, texto y "Botón (opcional)".
 * Va dentro del `FormProvider` del inicio.
 *
 * @param props - Ver {@link HomeStoryFieldsProps}.
 */
export function HomeStoryFields({ sceneKeys }: HomeStoryFieldsProps): ReactNode {
  return (
    <Section title={CONTENT_COPY.story}>
      {sceneKeys.map((key, index) => (
        <FieldGroup key={key} title={CONTENT_COPY.scenes[key]}>
          <HomeText
            name={`scenes.${fieldIndex(index)}.eyebrow`}
            label={CONTENT_COPY.eyebrow}
            maxLength={60}
          />
          <HomeTitleLines name={`scenes.${fieldIndex(index)}.titleLines`} />
          <HomeText
            name={`scenes.${fieldIndex(index)}.text`}
            label={CONTENT_COPY.text}
            maxLength={600}
            multiline
          />
          <HomeText
            name={`scenes.${fieldIndex(index)}.ctaLabel`}
            label={CONTENT_COPY.optionalCta}
            maxLength={40}
          />
        </FieldGroup>
      ))}
    </Section>
  )
}
