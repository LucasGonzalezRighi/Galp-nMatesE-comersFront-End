import type { ReactNode } from 'react'
import { TrashIcon } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import type { AboutContentFormInput } from '@galpon/schemas'
import type { UploadStatus } from '../../../components/media/media.types'
import { MEDIA_COPY } from '../../../components/media/media.copy'
import { useSingleImageUpload } from '../../../components/media/use-single-image-upload'
import { Button } from '../../../components/ui/Button'
import { SingleImageField } from '../../../components/ui/SingleImageField'
import { CONTENT_COPY, positionLabel, removePartnerLabel } from '../content.copy'
import { fieldIndex } from '../list-utils'
import { FieldGroup } from './FieldGroup'
import { TextField } from './TextField'

/** Campo de texto del formulario de Nosotros. */
const AboutText = TextField<AboutContentFormInput>

/** Largo mínimo del texto alternativo (el de `imageFormSchema`). */
const ALT_MIN_LENGTH = 3

/** Props de {@link PartnerFields}. */
export interface PartnerFieldsProps {
  /** Lugar del socio en el formulario, desde 0. */
  index: number
  /** Dirección de cada foto por su `publicId` (las guardadas y las recién subidas). */
  photoUrls: Readonly<Record<string, string>>
  /** Avisa una foto recién subida, para mostrarla por su `publicId`. Estable (`useCallback`). */
  onPhotoUploaded: (publicId: string, url: string) => void
  /** Clave estable del socio (el `id` de `useFieldArray`), para `onUploadStatus`. */
  uploadKey: string
  /**
   * Avisa si la foto del socio de `key` está subiendo, falló o no tiene nada pendiente (`null`).
   * Tiene que ser estable (`useCallback`).
   */
  onUploadStatus: (key: string, status: Exclude<UploadStatus, 'done'> | null) => void
  /** Quita al socio del formulario. */
  onRemove: () => void
}

/**
 * Un socio de Nosotros: "Nombre", "Rol" y "Foto" (`SingleImageField` con
 * `useSingleImageUpload({ purpose: 'partner' })`). Cuando la foto termina de subir pasa al
 * formulario como `ImageInput` (sin `url`), con el nombre como texto alternativo si alcanza.
 * Va dentro del `FormProvider` de Nosotros.
 *
 * @param props - Ver {@link PartnerFieldsProps}.
 */
export function PartnerFields({
  index,
  photoUrls,
  onPhotoUploaded,
  uploadKey,
  onUploadStatus,
  onRemove,
}: PartnerFieldsProps): ReactNode {
  const { control, getValues, setValue, getFieldState, formState } =
    useFormContext<AboutContentFormInput>()
  const name = useWatch({ control, name: `partners.${fieldIndex(index)}.name` })
  const photo = useWatch({ control, name: `partners.${fieldIndex(index)}.photo` })
  const upload = useSingleImageUpload({ purpose: 'partner' })
  const { item, remove } = upload
  const pending = item === null || item.status === 'done' ? null : item.status

  useEffect(() => {
    if (item?.status !== 'done' || item.result === null) return
    const { publicId, url, width, height } = item.result
    const currentName = getValues(`partners.${fieldIndex(index)}.name`).trim()
    onPhotoUploaded(publicId, url)
    setValue(
      `partners.${fieldIndex(index)}.photo`,
      { publicId, width, height, alt: currentName.length >= ALT_MIN_LENGTH ? currentName : '' },
      { shouldDirty: true },
    )
    remove()
  }, [item, index, getValues, setValue, onPhotoUploaded, remove])

  useEffect(() => {
    onUploadStatus(uploadKey, pending)
  }, [uploadKey, pending, onUploadStatus])

  useEffect(
    () => () => {
      onUploadStatus(uploadKey, null)
    },
    [uploadKey, onUploadStatus],
  )

  const displayName =
    name.trim() === '' ? positionLabel(CONTENT_COPY.partner, index + 1) : name.trim()
  const photoError =
    getFieldState(`partners.${fieldIndex(index)}.photo.publicId`, formState).error?.message ??
    getFieldState(`partners.${fieldIndex(index)}.photo`, formState).error?.message

  return (
    <FieldGroup
      title={displayName}
      actions={
        <Button
          variant="ghost"
          size="sm"
          aria-label={removePartnerLabel(displayName)}
          onClick={onRemove}
        >
          <TrashIcon size={18} weight="regular" aria-hidden="true" />
          {CONTENT_COPY.remove}
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <AboutText
          name={`partners.${fieldIndex(index)}.name`}
          label={CONTENT_COPY.partnerName}
          maxLength={60}
        />
        <AboutText
          name={`partners.${fieldIndex(index)}.role`}
          label={CONTENT_COPY.partnerRole}
          maxLength={80}
        />
      </div>
      <SingleImageField
        label={CONTENT_COPY.partnerPhoto}
        hint={MEDIA_COPY.hint}
        image={photo === null ? null : { src: photoUrls[photo.publicId] ?? '', alt: photo.alt }}
        upload={
          item === null || item.status === 'done'
            ? null
            : {
                previewUrl: item.previewUrl,
                status: item.status,
                progress: item.progress,
                errorMessage: item.errorMessage,
              }
        }
        error={upload.error ?? photoError}
        onFiles={(files) => {
          void upload.add(files)
        }}
        onCancel={upload.cancel}
        onRetry={upload.retry}
        onRemove={() => {
          remove()
          setValue(`partners.${fieldIndex(index)}.photo`, null, { shouldDirty: true })
        }}
        altField={
          photo === null ? null : (
            <AboutText
              name={`partners.${fieldIndex(index)}.photo.alt`}
              label={CONTENT_COPY.photoAlt}
              maxLength={120}
            />
          )
        }
      />
    </FieldGroup>
  )
}
