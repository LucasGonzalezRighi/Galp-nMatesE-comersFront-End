import type { ReactNode } from 'react'
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { useFieldArray, useWatch } from 'react-hook-form'
import type { ImageUploads } from '../../../components/media/use-image-uploads'
import type { ProductFormOutput, ProductFormValues } from '../product-form-values'
import { MEDIA_COPY } from '../../../components/media/media.copy'
import { Button } from '../../../components/ui/Button'
import { Field } from '../../../components/ui/Field'
import { ImageDropzone } from '../../../components/ui/ImageDropzone'
import { ImageTile } from '../../../components/ui/ImageTile'
import { Section } from '../../../components/ui/Section'
import { SortableList } from '../../../components/ui/SortableList'
import { TextInput } from '../../../components/ui/TextInput'
import { photoAltPath } from '../product-form-values'
import { MAX_PRODUCT_PHOTOS, PHOTO_ALT_MAX_LENGTH } from '../products.constants'
import {
  dragPhotoLabel,
  movePhotoAfterLabel,
  movePhotoBeforeLabel,
  PRODUCT_FORM_COPY,
  removePhotoLabel,
} from '../products.copy'

/** Props de {@link ProductPhotosField}. */
export interface ProductPhotosFieldProps {
  /** `control` del formulario de producto. */
  control: Control<ProductFormValues, unknown, ProductFormOutput>
  /** `register` del formulario, para el texto alternativo de cada foto. */
  register: UseFormRegister<ProductFormValues>
  /** Errores del formulario (`images.N.alt`, `images.N.publicId`, el cupo). */
  errors: FieldErrors<ProductFormValues>
  /** La cola de subidas (`useImageUploads({ purpose: 'product', max: 8 })`) del formulario. */
  uploads: ImageUploads
  /** Nombre del producto en ese momento: precompleta el texto alternativo de cada foto subida. */
  getProductName: () => string
}

/**
 * Sección "Fotos" del producto: hasta 8, la primera es la principal.
 *
 * Las fotos guardadas (o ya subidas) se ordenan en una `SortableList` horizontal: cada una con su
 * "Texto alternativo", "Mover la foto {n} antes" / "… después" y la agarradera "Arrastrar la foto
 * {n}". Las que se están subiendo (o fallaron) van aparte, con "Cancelar", "Reintentar" y
 * "Quitar". Cuando una termina, pasa al formulario con el nombre del producto como texto
 * alternativo y sale de la cola (`remove(id)`), así el cupo no la cuenta dos veces. El área para
 * elegir fotos se ve mientras quede cupo.
 *
 * @param props - Ver {@link ProductPhotosFieldProps}.
 */
export function ProductPhotosField({
  control,
  register,
  errors,
  uploads,
  getProductName,
}: ProductPhotosFieldProps): ReactNode {
  const { fields, append, remove, move } = useFieldArray({ control, name: 'images' })
  const images = useWatch({ control, name: 'images' })
  const { items, remove: removeUpload } = uploads

  useEffect(() => {
    const done = items.flatMap((item) =>
      item.status === 'done' && item.result !== null ? [{ id: item.id, result: item.result }] : [],
    )
    if (done.length === 0) return
    const alt = getProductName().trim()
    append(
      done.map(({ result }) => ({ ...result, alt })),
      { shouldFocus: false },
    )
    for (const { id } of done) removeUpload(id)
  }, [items, append, removeUpload, getProductName])

  /** Lleva el orden nuevo de la lista al formulario, moviendo cada foto a su lugar. */
  function reorder(next: readonly (typeof fields)[number][]) {
    const keys = fields.map((field) => field.id)
    next.forEach((field, target) => {
      const from = keys.indexOf(field.id)
      if (from === target || from === -1) return
      move(from, target)
      const [key] = keys.splice(from, 1)
      if (key !== undefined) keys.splice(target, 0, key)
    })
  }

  const hasRoom = fields.length + items.length < MAX_PRODUCT_PHOTOS
  const listError = errors.images?.root?.message ?? errors.images?.message

  return (
    <Section
      title={PRODUCT_FORM_COPY.photosSection}
      description={`${MEDIA_COPY.hint} ${PRODUCT_FORM_COPY.photosHint}`}
    >
      {fields.length > 0 && (
        <SortableList
          items={fields}
          getKey={(field) => field.id}
          label={PRODUCT_FORM_COPY.photosList}
          axis="x"
          onReorder={reorder}
          renderItem={(field, { index, isFirst, isLast, moveUp, moveDown, dragHandle }) => {
            // El nombre del campo sigue el orden guardado en el formulario; el número que se lee,
            // el que se ve (mientras se arrastra pueden no coincidir).
            const formIndex = fields.findIndex((candidate) => candidate.id === field.id)
            if (formIndex === -1) return null
            const position = index + 1
            const photoErrors = errors.images?.[formIndex]
            const error =
              photoErrors?.alt?.message ??
              photoErrors?.publicId?.message ??
              photoErrors?.width?.message ??
              photoErrors?.height?.message
            return (
              <div className="flex w-48 shrink-0 flex-col gap-2 pb-1">
                <ImageTile
                  src={field.url}
                  alt={images[formIndex]?.alt ?? field.alt}
                  status="done"
                  isMain={index === 0}
                  removeLabel={removePhotoLabel(position)}
                  onRemove={() => {
                    remove(formIndex)
                  }}
                >
                  <Field
                    label={PRODUCT_FORM_COPY.alt}
                    hint={PRODUCT_FORM_COPY.altHint}
                    error={error}
                  >
                    {(fieldControl) => (
                      <TextInput
                        {...fieldControl}
                        maxLength={PHOTO_ALT_MAX_LENGTH}
                        {...register(photoAltPath(formIndex))}
                      />
                    )}
                  </Field>
                </ImageTile>
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="icon"
                    aria-label={movePhotoBeforeLabel(position)}
                    title={PRODUCT_FORM_COPY.moveBefore}
                    disabled={isFirst}
                    onClick={moveUp}
                  >
                    <CaretLeftIcon size={18} weight="regular" aria-hidden="true" />
                  </Button>
                  {dragHandle(dragPhotoLabel(position))}
                  <Button
                    variant="icon"
                    aria-label={movePhotoAfterLabel(position)}
                    title={PRODUCT_FORM_COPY.moveAfter}
                    disabled={isLast}
                    onClick={moveDown}
                  >
                    <CaretRightIcon size={18} weight="regular" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )
          }}
        />
      )}
      {items.length > 0 && (
        <ul
          aria-label={PRODUCT_FORM_COPY.uploadingList}
          className="m-0 flex list-none flex-wrap gap-2 p-0"
        >
          {items.map((item) => (
            <li key={item.id} className="w-48">
              <ImageTile
                src={item.previewUrl}
                alt=""
                status={item.status}
                progress={item.progress}
                errorMessage={item.errorMessage ?? undefined}
                onCancel={() => {
                  uploads.cancel(item.id)
                }}
                onRetry={() => {
                  uploads.retry(item.id)
                }}
                onRemove={() => {
                  removeUpload(item.id)
                }}
              />
            </li>
          ))}
        </ul>
      )}
      {hasRoom ? (
        <ImageDropzone
          multiple
          error={uploads.error ?? undefined}
          onFiles={(files) => {
            void uploads.add(files)
          }}
        />
      ) : (
        uploads.error !== null && (
          <p role="alert" className="text-danger text-sm">
            {uploads.error}
          </p>
        )
      )}
      {listError !== undefined && (
        <p role="alert" className="text-danger text-sm">
          {listError}
        </p>
      )}
    </Section>
  )
}
