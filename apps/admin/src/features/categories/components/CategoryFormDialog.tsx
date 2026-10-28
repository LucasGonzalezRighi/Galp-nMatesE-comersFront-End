import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useId, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { Category } from '@galpon/api-client'
import type { CategoryForm, CategoryFormInput } from '@galpon/schemas'
import { isApiError } from '@galpon/api-client'
import { PRODUCT_GROUPS, slugify } from '@galpon/domain'
import { categoryFormSchema } from '@galpon/schemas'
import { MEDIA_COPY } from '../../../components/media/media.copy'
import { useSingleImageUpload } from '../../../components/media/use-single-image-upload'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Dialog } from '../../../components/ui/Dialog'
import { Field } from '../../../components/ui/Field'
import { Select } from '../../../components/ui/Select'
import { SingleImageField } from '../../../components/ui/SingleImageField'
import { Textarea } from '../../../components/ui/Textarea'
import { TextInput } from '../../../components/ui/TextInput'
import { toast } from '../../../components/ui/toast'
import { CATEGORIES_COPY } from '../categories.copy'
import { CATEGORY_BLURB_MAX_LENGTH, categoryFormValues } from '../category-form-values'
import { useSaveCategory } from '../use-save-category'

/** Campos que pueden traer un error del servidor (`422`), con las rutas del contrato. */
const CATEGORY_FIELDS = [
  'name',
  'slug',
  'group',
  'blurb',
  'image',
  'image.alt',
  'image.publicId',
] as const

/** Opciones del grupo, en el orden del dominio. */
const GROUP_OPTIONS = PRODUCT_GROUPS.map((group) => ({
  value: group,
  label: CATEGORIES_COPY.groups[group],
}))

/** Props de {@link CategoryFormDialog}. */
export interface CategoryFormDialogProps {
  /** Si está abierto. */
  open: boolean
  /** La línea que se edita, o `null` para crear una. */
  category: Category | null
  /** Se llama para cerrarlo: al guardar, al cancelar sin cambios o al descartarlos. */
  onClose: () => void
}

/**
 * Diálogo "Nueva línea" / "Editar línea" (`categoryFormSchema`): nombre, slug (al crear sigue al
 * nombre con `slugify` hasta que se lo toca a mano), grupo, bajada con contador y una foto con su
 * texto alternativo (`useSingleImageUpload({ purpose: 'category' })`; al terminar de subir, el
 * texto se completa con el nombre si estaba vacío).
 *
 * Un `409 slug_taken` va al campo "Slug" y un `422`, a cada campo; otro error, a un toast. No
 * guarda con una foto subiendo o con error. Cerrarlo con cambios pregunta "¿Descartar los
 * cambios?". Quien lo usa le cambia la `key` en cada apertura, así arranca de cero.
 *
 * @param props - Ver {@link CategoryFormDialogProps}.
 */
export function CategoryFormDialog({
  open,
  category,
  onClose,
}: CategoryFormDialogProps): ReactNode {
  const formId = useId()
  const isNew = category === null
  const [defaultValues] = useState(() => categoryFormValues(category))
  const [autoSlug, setAutoSlug] = useState(isNew)
  const [photoPending, setPhotoPending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const save = useSaveCategory(category?.id ?? null)
  const upload = useSingleImageUpload({ purpose: 'category' })
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    setError,
    formState: { errors, isDirty, isSubmitted },
  } = useForm<CategoryFormInput, undefined, CategoryForm>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues,
  })
  const image = useWatch({ control, name: 'image' })
  const uploaded = upload.item?.status === 'done' ? upload.item.result : null
  // Subiendo o con error: tapa a la foto del formulario y no deja guardar.
  const pendingUpload = upload.item !== null && upload.item.status !== 'done' ? upload.item : null
  // Dirección de cada foto que pasó por el formulario (la guardada y las subidas), por publicId:
  // así, si una foto nueva falla y se quita, la anterior se sigue viendo.
  const [photoUrls, setPhotoUrls] = useState<Readonly<Record<string, string>>>(() => {
    const saved = category?.image ?? null
    return saved === null ? {} : { [saved.publicId]: saved.url }
  })
  if (uploaded !== null && photoUrls[uploaded.publicId] === undefined) {
    setPhotoUrls({ ...photoUrls, [uploaded.publicId]: uploaded.url })
  }
  const photoUrl = image === null ? '' : (photoUrls[image.publicId] ?? '')

  // Una foto recién subida pasa al formulario; el texto alternativo vacío toma el nombre.
  useEffect(() => {
    if (uploaded === null || getValues('image')?.publicId === uploaded.publicId) return
    const alt = getValues('image')?.alt ?? ''
    setValue(
      'image',
      {
        publicId: uploaded.publicId,
        width: uploaded.width,
        height: uploaded.height,
        alt: alt.trim() === '' ? getValues('name').trim() : alt,
      },
      { shouldDirty: true },
    )
  }, [uploaded, getValues, setValue])

  const close = () => {
    upload.remove()
    onClose()
  }

  const requestClose = () => {
    if (save.isPending) return
    if (isDirty || pendingUpload !== null) setConfirmOpen(true)
    else close()
  }

  const handleSaveError = (error: unknown) => {
    if (!isApiError(error)) {
      toast.error(CATEGORIES_COPY.form.saveError)
      return
    }
    // "Tu sesión venció" (401) y el token CSRF rotado (403) los resuelve la estructura.
    if (error.kind === 'unauthorized' || error.kind === 'forbidden') return
    if (error.kind === 'conflict' && error.problem?.type === 'slug_taken') {
      setError('slug', { message: CATEGORIES_COPY.form.slugTaken }, { shouldFocus: true })
      return
    }
    const withError = CATEGORY_FIELDS.filter((field) => error.fieldErrors[field] !== undefined)
    for (const field of withError) setError(field, { message: error.fieldErrors[field] })
    if (withError.length === 0) toast.error(error.message)
  }

  const submit = handleSubmit((values) => {
    if (pendingUpload !== null) {
      setPhotoPending(true)
      return
    }
    save.mutate(values, { onSuccess: onClose, onError: handleSaveError })
  })

  const nameField = register('name', {
    onChange: () => {
      if (autoSlug) {
        setValue('slug', slugify(getValues('name')), {
          shouldDirty: true,
          shouldValidate: isSubmitted,
        })
      }
    },
  })
  const slugField = register('slug', {
    onChange: () => {
      setAutoSlug(false)
    },
  })
  const photoError =
    upload.error ??
    (photoPending && pendingUpload !== null ? CATEGORIES_COPY.form.photoPending : undefined) ??
    errors.image?.publicId?.message ??
    errors.image?.message

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose()
        }}
        title={isNew ? CATEGORIES_COPY.form.createTitle : CATEGORIES_COPY.form.editTitle}
        footer={
          <>
            <Button variant="secondary" disabled={save.isPending} onClick={requestClose}>
              {CATEGORIES_COPY.form.cancel}
            </Button>
            <Button type="submit" form={formId} isLoading={save.isPending}>
              {save.isPending ? CATEGORIES_COPY.form.saving : CATEGORIES_COPY.form.save}
            </Button>
          </>
        }
      >
        <form
          id={formId}
          noValidate
          onSubmit={(event) => {
            void submit(event)
          }}
          className="flex flex-col gap-4"
        >
          <Field label={CATEGORIES_COPY.form.name} error={errors.name?.message} required>
            {(field) => <TextInput {...field} autoComplete="off" {...nameField} />}
          </Field>
          <Field label={CATEGORIES_COPY.form.slug} error={errors.slug?.message} required>
            {(field) => <TextInput {...field} autoComplete="off" {...slugField} />}
          </Field>
          <Field label={CATEGORIES_COPY.form.group} error={errors.group?.message} required>
            {(field) => <Select {...field} options={GROUP_OPTIONS} {...register('group')} />}
          </Field>
          <Field
            label={CATEGORIES_COPY.form.blurb}
            hint={CATEGORIES_COPY.form.blurbHint}
            error={errors.blurb?.message}
          >
            {(field) => (
              <Textarea {...field} maxLength={CATEGORY_BLURB_MAX_LENGTH} {...register('blurb')} />
            )}
          </Field>
          <SingleImageField
            label={CATEGORIES_COPY.form.photo}
            hint={MEDIA_COPY.hint}
            image={image === null ? null : { src: photoUrl, alt: image.alt }}
            upload={
              pendingUpload === null
                ? null
                : {
                    previewUrl: pendingUpload.previewUrl,
                    status: pendingUpload.status,
                    progress: pendingUpload.progress,
                    errorMessage: pendingUpload.errorMessage,
                  }
            }
            error={photoError}
            onFiles={(files) => {
              setPhotoPending(false)
              void upload.add(files)
            }}
            onCancel={upload.cancel}
            onRetry={upload.retry}
            onRemove={() => {
              setValue('image', null, { shouldDirty: true })
              upload.remove()
            }}
            altField={
              image === null ? null : (
                <Field
                  label={CATEGORIES_COPY.form.alt}
                  hint={CATEGORIES_COPY.form.altHint}
                  error={errors.image?.alt?.message}
                  required
                >
                  {(field) => (
                    <TextInput {...field} autoComplete="off" {...register('image.alt')} />
                  )}
                </Field>
              )
            }
          />
        </form>
      </Dialog>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={CATEGORIES_COPY.discard.title}
        description={CATEGORIES_COPY.discard.description}
        confirmLabel={CATEGORIES_COPY.discard.confirm}
        cancelLabel={CATEGORIES_COPY.discard.keepEditing}
        tone="danger"
        isPending={false}
        onConfirm={() => {
          setConfirmOpen(false)
          close()
        }}
      />
    </>
  )
}
