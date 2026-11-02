'use client'

import type { CSSProperties, ReactNode, SubmitEvent } from 'react'
import { StarIcon } from '@phosphor-icons/react/Star'
import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { createReview, isApiError } from '@galpon/api-client'
import { STAR_WORDS } from '@galpon/domain'
import { reviewSchema, toFieldErrors } from '@galpon/schemas'
import { DrawCheck, Reveal, Shake, type ShakeHandle } from '../../components/motion'
import { Button, Field, Input, Textarea } from '../../components/ui'
import { cx } from '../../components/ui/cx'
import { getBrowserApi } from '../../lib/api.browser'
import { asRoute } from '../../lib/routes'
import { REVIEWS_COPY, reviewFormTitle, starLabel } from './reviews.copy'

/** Props de {@link ReviewForm}. */
export interface ReviewFormProps {
  /** Slug del producto que se reseña. */
  slug: string
  /** Nombre del producto, para el título. */
  productName: string
  /** Se llama al cancelar o al cerrar la confirmación. */
  onClose: () => void
}

/** Campos del formulario que muestran un error. */
type FieldName = 'rating' | 'authorName' | 'text'

/** Mensaje de error de cada campo que lo tiene. */
type FieldErrors = Partial<Record<FieldName, string>>

/** Los campos que se pueden marcar, para quedarse solo con esos de un mapa de errores. */
const FIELD_NAMES: readonly FieldName[] = ['rating', 'authorName', 'text']

/** Las cinco puntuaciones, de menor a mayor. */
const STAR_VALUES = [1, 2, 3, 4, 5] as const

/** Marco de la tarjeta: anillo y resplandor cobre sobre `surface`. */
const CARD_STYLE: CSSProperties = {
  boxShadow: '0 0 0 1px var(--color-accent-700), 0 0 40px -16px var(--color-accent)',
}

/** Clases de la tarjeta (formulario y confirmación). */
const CARD_CLASS = 'bg-surface mb-6 flex rounded-[14px] p-[22px]'

/** Se queda con los mensajes de los campos conocidos, descartando el resto (por ejemplo el del campo trampa). */
function pickFieldErrors(source: Readonly<Record<string, string>>): FieldErrors {
  const errors: FieldErrors = {}
  for (const field of FIELD_NAMES) {
    const message = source[field]
    if (message !== undefined) errors[field] = message
  }
  return errors
}

/**
 * Formulario de reseña (spec 9.5): estrellas con hover y palabra ("Malo" … "Excelente"), nombre
 * opcional, texto, aviso de privacidad y un campo trampa oculto contra bots. Valida con
 * `reviewSchema` (si falla, marca los campos y el formulario tiembla con `Shake`) y envía con
 * `createReview`; los errores del servidor se muestran por campo o, si no, en el formulario. Al
 * enviar muestra "Gracias, tu reseña se publica cuando la revisemos": la reseña queda pendiente
 * de aprobación.
 *
 * @param props - Ver {@link ReviewFormProps}.
 */
export function ReviewForm({ slug, productName, onClose }: ReviewFormProps): ReactNode {
  const groupName = useId()
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [website, setWebsite] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [status, setStatus] = useState<'editing' | 'sending' | 'sent'>('editing')
  const shake = useRef<ShakeHandle>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [])

  const shown = hovered > 0 ? hovered : rating
  const word = STAR_WORDS[shown - 1] ?? REVIEWS_COPY.pickRating
  const clearError = (field: FieldName): void => {
    setErrors((current) => ({ ...current, [field]: undefined }))
  }
  const fail = (found: FieldErrors): void => {
    setErrors(found)
    shake.current?.shake()
  }

  const submit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (status === 'sending') return
    setFormError(null)
    const parsed = reviewSchema.safeParse({ rating, authorName: name, text, website: undefined })
    if (!parsed.success) {
      fail(pickFieldErrors(toFieldErrors(parsed.error)))
      return
    }
    setErrors({})
    setStatus('sending')
    try {
      await createReview(getBrowserApi(), slug, {
        rating: parsed.data.rating,
        authorName: parsed.data.authorName,
        text: parsed.data.text,
        website,
      })
      setStatus('sent')
    } catch (error) {
      setStatus('editing')
      const fieldErrors = isApiError(error) ? pickFieldErrors(error.fieldErrors) : {}
      if (Object.keys(fieldErrors).length > 0) {
        fail(fieldErrors)
      } else {
        setFormError(
          isApiError(error) && (error.kind === 'validation' || error.kind === 'rate_limited')
            ? error.message
            : REVIEWS_COPY.networkError,
        )
      }
    }
  }

  if (status === 'sent') {
    return (
      <div role="status" className={cx(CARD_CLASS, 'items-center gap-4')} style={CARD_STYLE}>
        <DrawCheck size={44} />
        <p className="m-0 flex-1 text-[16px]">{REVIEWS_COPY.thanks}</p>
        <Button variant="ghost" onClick={onClose}>
          {REVIEWS_COPY.close}
        </Button>
      </div>
    )
  }

  const sending = status === 'sending'
  return (
    <Reveal kind="up" duration={700}>
      <Shake ref={shake}>
        <form
          noValidate
          aria-labelledby={`${groupName}-title`}
          className={cx(CARD_CLASS, 'flex-col gap-[14px]')}
          style={CARD_STYLE}
          onSubmit={(event) => {
            void submit(event)
          }}
        >
          <h3
            ref={heading}
            id={`${groupName}-title`}
            tabIndex={-1}
            className="m-0 text-[17px] font-normal outline-none"
          >
            {reviewFormTitle(productName)}
          </h3>
          <div>
            <fieldset
              className="m-0 border-0 p-0"
              onMouseLeave={() => {
                setHovered(0)
              }}
            >
              <legend className="sr-only">{REVIEWS_COPY.ratingLegend}</legend>
              <div className="flex items-center gap-[2px]">
                {STAR_VALUES.map((value) => (
                  <label
                    key={value}
                    className={cx(
                      'ease-spring has-[input:focus-visible]:outline-accent cursor-pointer rounded-sm p-1 transition-[transform,color] duration-[250ms] has-[input:focus-visible]:outline-2 motion-reduce:transition-none',
                      shown >= value ? 'text-accent' : 'text-neutral-700',
                      hovered === value ? 'scale-[1.2]' : 'scale-100',
                    )}
                    onMouseEnter={() => {
                      setHovered(value)
                    }}
                  >
                    <input
                      type="radio"
                      name={`${groupName}-rating`}
                      value={value}
                      checked={rating === value}
                      aria-describedby={
                        errors.rating === undefined ? undefined : `${groupName}-rating-error`
                      }
                      className="sr-only"
                      onChange={() => {
                        setRating(value)
                        clearError('rating')
                      }}
                    />
                    <span className="sr-only">{starLabel(value)}</span>
                    <StarIcon size={26} weight="fill" aria-hidden="true" />
                  </label>
                ))}
                <span aria-hidden="true" className="ml-[10px] text-[13px] text-neutral-400">
                  {word}
                </span>
              </div>
            </fieldset>
            <div aria-live="polite">
              {errors.rating === undefined ? null : (
                <p id={`${groupName}-rating-error`} className="text-danger mt-[5px] text-[12px]">
                  {errors.rating}
                </p>
              )}
            </div>
          </div>
          <Field label={REVIEWS_COPY.name} error={errors.authorName}>
            {(control) => (
              <Input
                {...control}
                name="authorName"
                autoComplete="name"
                placeholder={REVIEWS_COPY.namePlaceholder}
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  clearError('authorName')
                }}
              />
            )}
          </Field>
          <Field label={REVIEWS_COPY.text} error={errors.text}>
            {(control) => (
              <Textarea
                {...control}
                name="text"
                placeholder={REVIEWS_COPY.textPlaceholder}
                value={text}
                onChange={(event) => {
                  setText(event.target.value)
                  clearError('text')
                }}
              />
            )}
          </Field>
          {/* Campo trampa: las personas no lo ven ni llegan con el teclado; un bot lo llena. */}
          <div aria-hidden="true" className="absolute -left-[10000px] h-0 w-0 overflow-hidden">
            <label>
              {REVIEWS_COPY.honeypot}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => {
                  setWebsite(event.target.value)
                }}
              />
            </label>
          </div>
          <p className="m-0 text-[12px] text-neutral-400">
            {REVIEWS_COPY.privacyBefore}{' '}
            <Link href={asRoute('/privacidad')} className="text-accent underline">
              {REVIEWS_COPY.privacyLink}
            </Link>
            .
          </p>
          {formError === null ? null : (
            <p role="alert" className="text-danger m-0 text-[13px]">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-[10px]">
            <Button variant="secondary" onClick={onClose}>
              {REVIEWS_COPY.cancel}
            </Button>
            <Button type="submit" loading={sending}>
              {sending ? REVIEWS_COPY.sending : REVIEWS_COPY.submit}
            </Button>
          </div>
        </form>
      </Shake>
    </Reveal>
  )
}
