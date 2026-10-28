import type { ChangeEvent, ReactNode, SyntheticEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useId, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import type { AdminProduct } from '@galpon/api-client'
import { isApiError } from '@galpon/api-client'
import { adminCategoriesQuery, adminProductQuery, useApiClient } from '@galpon/api-client/react'
import { slugify } from '@galpon/domain'
import type { SegmentedOption } from '../../../components/ui/SegmentedControl'
import type { ProductFormOutput, ProductFormValues } from '../product-form-values'
import { useImageUploads } from '../../../components/media/use-image-uploads'
import { Button } from '../../../components/ui/Button'
import { Checkbox } from '../../../components/ui/Checkbox'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Field } from '../../../components/ui/Field'
import { FormActions } from '../../../components/ui/FormActions'
import { MoneyInput } from '../../../components/ui/MoneyInput'
import { NumberInput } from '../../../components/ui/NumberInput'
import { Section } from '../../../components/ui/Section'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { Select } from '../../../components/ui/Select'
import { Switch } from '../../../components/ui/Switch'
import { Textarea } from '../../../components/ui/Textarea'
import { TextInput } from '../../../components/ui/TextInput'
import { toast } from '../../../components/ui/toast'
import { UnsavedChangesGuard } from '../../../components/ui/UnsavedChangesGuard'
import {
  isProductFormPath,
  newProductFormValues,
  productFormValuesSchema,
  toAdminProductInput,
  toProductFormValues,
} from '../product-form-values'
import {
  MAX_PRODUCT_PHOTOS,
  PRODUCT_DESCRIPTION_MAX_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
} from '../products.constants'
import {
  previousSlugsHint,
  PRODUCT_FORM_COPY,
  slugAddressHint,
  slugRedirectHint,
} from '../products.copy'
import { useRepublishProduct, useSaveProduct } from '../use-save-product'
import { ProductPhotosField } from './ProductPhotosField'
import { ProductTabsFields } from './ProductTabsFields'

/** Props de {@link ProductForm}. */
export interface ProductFormProps {
  /** Producto a editar (la versión de la caché), o `null` para crear uno. */
  product: AdminProduct | null
}

/** Opciones de "Estado": el archivado no se elige acá. */
const STATUS_OPTIONS: readonly SegmentedOption<ProductFormValues['status']>[] = [
  { value: 'draft', label: PRODUCT_FORM_COPY.draft },
  { value: 'published', label: PRODUCT_FORM_COPY.published },
]

/**
 * Formulario de producto (`productFormSchema`, validación al salir de cada campo): "Datos",
 * "Precio y stock", "Estado", "Fotos" y "Pestañas de la ficha", con `FormActions` y
 * `UnsavedChangesGuard`.
 *
 * - Al crear, el slug sigue a `slugify(nombre)` hasta que se lo toca a mano; al guardar avisa
 *   "Producto creado." y lleva a `/productos/$id`.
 * - Al editar manda `expectedUpdatedAt` (la versión que se abrió): si otra pestaña guardó antes,
 *   el `409 product_changed` ofrece "Guardar mis cambios igual" (sin `expectedUpdatedAt`) o "Ver
 *   la versión guardada" (recarga y descarta). Un archivado muestra el aviso con "Volver a
 *   publicar".
 * - No envía con fotos subiendo o con error. `409 slug_taken` va al slug; un `422`, a cada campo.
 *
 * @param props - Ver {@link ProductFormProps}.
 */
export function ProductForm({ product }: ProductFormProps): ReactNode {
  const api = useApiClient()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const productId = product?.id ?? null
  const featuredHintId = useId()
  const [baseUpdatedAt, setBaseUpdatedAt] = useState(product?.updatedAt ?? null)
  const [isSlugEdited, setIsSlugEdited] = useState(product !== null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [conflict, setConflict] = useState<ProductFormOutput | null>(null)
  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    reset,
    getValues,
    getFieldState,
    formState: { errors, isDirty },
  } = useForm<ProductFormValues, unknown, ProductFormOutput>({
    resolver: zodResolver(productFormValuesSchema),
    mode: 'onTouched',
    defaultValues: product === null ? newProductFormValues() : toProductFormValues(product),
  })
  const images = useWatch({ control, name: 'images' })
  const slug = useWatch({ control, name: 'slug' }).trim()
  const categoryId = useWatch({ control, name: 'categoryId' })
  const priceOnRequest = useWatch({ control, name: 'priceOnRequest' })
  const uploads = useImageUploads({
    purpose: 'product',
    max: MAX_PRODUCT_PHOTOS,
    current: images.length,
  })
  const categoriesQuery = useQuery(adminCategoriesQuery(api))
  const categories = categoriesQuery.data ?? []
  const group = categories.find((category) => category.id === categoryId)?.group ?? null
  const save = useSaveProduct(productId)
  const republish = useRepublishProduct()
  const getProductName = useCallback(() => getValues('name'), [getValues])

  // Después de crear, se navega en un efecto: para entonces ya se dibujó con `createdId` y la
  // guarda de cambios sin guardar está apagada (navegar en el mismo `onSuccess` la haría frenar).
  useEffect(() => {
    if (createdId !== null) void navigate({ to: '/productos/$id', params: { id: createdId } })
  }, [createdId, navigate])

  function clearUploads() {
    for (const item of uploads.items) uploads.remove(item.id)
  }

  /** Pone cada error de un `422` en su campo; devuelve `true` si todos tenían campo. */
  function applyFieldErrors(fieldErrors: Readonly<Record<string, string>>): boolean {
    const entries = Object.entries(fieldErrors)
    const known = entries.filter(([path]) => isProductFormPath(path))
    known.forEach(([path, message], index) => {
      if (isProductFormPath(path)) {
        setError(path, { type: 'server', message }, { shouldFocus: index === 0 })
      }
    })
    return known.length > 0 && known.length === entries.length
  }

  function handleSaveError(error: unknown, values: ProductFormOutput) {
    setConflict(null)
    if (!isApiError(error)) {
      toast.error(PRODUCT_FORM_COPY.unexpectedError)
      return
    }
    if (error.kind === 'unauthorized' || error.kind === 'forbidden') return
    if (error.kind === 'conflict' && error.problem?.type === 'slug_taken') {
      setError(
        'slug',
        { type: 'conflict', message: PRODUCT_FORM_COPY.slugTaken },
        { shouldFocus: true },
      )
      return
    }
    if (error.kind === 'conflict' && error.problem?.type === 'product_changed') {
      setConflict(values)
      return
    }
    if (error.kind === 'validation' && applyFieldErrors(error.fieldErrors)) return
    toast.error(error.message)
  }

  function saveValues(values: ProductFormOutput, overwrite: boolean) {
    const input = toAdminProductInput(values)
    const body =
      overwrite || baseUpdatedAt === null ? input : { ...input, expectedUpdatedAt: baseUpdatedAt }
    save.mutate(body, {
      onSuccess: (saved) => {
        setConflict(null)
        if (productId === null) {
          toast.success(PRODUCT_FORM_COPY.created)
          setCreatedId(saved.id)
          return
        }
        reset(toProductFormValues(saved))
        setBaseUpdatedAt(saved.updatedAt)
        toast.success(PRODUCT_FORM_COPY.saved)
      },
      onError: (error) => {
        handleSaveError(error, values)
      },
    })
  }

  async function showSavedVersion() {
    setConflict(null)
    if (productId === null) return
    try {
      const saved = await queryClient.query({
        ...adminProductQuery(api, productId),
        staleTime: 0,
      })
      reset(toProductFormValues(saved))
      setBaseUpdatedAt(saved.updatedAt)
      clearUploads()
    } catch (error) {
      if (isApiError(error) && error.kind === 'unauthorized') return
      toast.error(isApiError(error) ? error.message : PRODUCT_FORM_COPY.unexpectedError)
    }
  }

  function republishProduct(current: AdminProduct) {
    republish.mutate(
      { product: current, expectedUpdatedAt: baseUpdatedAt ?? current.updatedAt },
      {
        onSuccess: (saved) => {
          reset(toProductFormValues(saved), { keepDirtyValues: true })
          setBaseUpdatedAt(saved.updatedAt)
          toast.success(PRODUCT_FORM_COPY.republished)
        },
        onError: (error) => {
          if (!isApiError(error)) {
            toast.error(PRODUCT_FORM_COPY.unexpectedError)
            return
          }
          if (error.kind === 'unauthorized' || error.kind === 'forbidden') return
          toast.error(error.message)
        },
      },
    )
  }

  function submit(event: SyntheticEvent<HTMLFormElement>) {
    if (uploads.isUploading || uploads.hasErrors) {
      event.preventDefault()
      toast.error(
        uploads.isUploading
          ? PRODUCT_FORM_COPY.uploadsInProgress
          : PRODUCT_FORM_COPY.uploadsWithErrors,
      )
      return
    }
    void handleSubmit((values) => {
      saveValues(values, false)
    })(event)
  }

  const slugHints = [
    slug === '' ? null : slugAddressHint(slug),
    product !== null && slug !== '' && slug !== product.slug
      ? slugRedirectHint(product.slug, slug)
      : null,
    product !== null && product.previousSlugs.length > 0
      ? previousSlugsHint(product.previousSlugs)
      : null,
  ].filter((hint) => hint !== null)

  return (
    <>
      {product?.status === 'archived' && (
        <div className="border-divider bg-surface flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 shadow-sm">
          <p className="text-sm">{PRODUCT_FORM_COPY.archivedNotice}</p>
          <Button
            variant="secondary"
            isLoading={republish.isPending}
            onClick={() => {
              republishProduct(product)
            }}
          >
            {PRODUCT_FORM_COPY.republish}
          </Button>
        </div>
      )}
      <form noValidate onSubmit={submit} className="flex flex-col gap-6">
        <Section title={PRODUCT_FORM_COPY.dataSection}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={PRODUCT_FORM_COPY.name} error={errors.name?.message} required>
              {(fieldControl) => (
                <TextInput
                  {...fieldControl}
                  maxLength={PRODUCT_NAME_MAX_LENGTH}
                  {...register('name', {
                    onChange: (event: ChangeEvent<HTMLInputElement>) => {
                      if (isSlugEdited) return
                      setValue('slug', slugify(event.target.value), {
                        shouldDirty: true,
                        shouldValidate: getFieldState('slug').isTouched,
                      })
                    },
                  })}
                />
              )}
            </Field>
            <Field
              label={PRODUCT_FORM_COPY.slug}
              error={errors.slug?.message}
              required
              hint={
                slugHints.length === 0
                  ? undefined
                  : slugHints.map((hint) => (
                      <span key={hint} className="block">
                        {hint}
                      </span>
                    ))
              }
            >
              {(fieldControl) => (
                <TextInput
                  {...fieldControl}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                  {...register('slug', {
                    onChange: () => {
                      setIsSlugEdited(true)
                    },
                  })}
                />
              )}
            </Field>
          </div>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Field label={PRODUCT_FORM_COPY.line} error={errors.categoryId?.message} required>
                {(fieldControl) => (
                  <Select
                    {...fieldControl}
                    {...field}
                    options={categories.map((category) => ({
                      value: category.id,
                      label: category.name,
                    }))}
                    placeholder={PRODUCT_FORM_COPY.linePlaceholder}
                  />
                )}
              </Field>
            )}
          />
          <Field label={PRODUCT_FORM_COPY.description} error={errors.description?.message} required>
            {(fieldControl) => (
              <Textarea
                {...fieldControl}
                maxLength={PRODUCT_DESCRIPTION_MAX_LENGTH}
                {...register('description')}
              />
            )}
          </Field>
        </Section>

        <Section title={PRODUCT_FORM_COPY.priceSection}>
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Controller
                control={control}
                name="priceArs"
                render={({ field }) => (
                  <Field label={PRODUCT_FORM_COPY.price} error={errors.priceArs?.message}>
                    {(fieldControl) => (
                      <MoneyInput {...fieldControl} {...field} disabled={priceOnRequest} />
                    )}
                  </Field>
                )}
              />
              <Checkbox
                label={PRODUCT_FORM_COPY.priceOnRequest}
                {...register('priceOnRequest', {
                  onChange: (event: ChangeEvent<HTMLInputElement>) => {
                    if (!event.target.checked) return
                    setValue('priceArs', null, { shouldDirty: true })
                    clearErrors('priceArs')
                  },
                })}
              />
            </div>
            <Controller
              control={control}
              name="stock"
              render={({ field }) => (
                <Field label={PRODUCT_FORM_COPY.stock} error={errors.stock?.message} required>
                  {(fieldControl) => <NumberInput {...fieldControl} {...field} />}
                </Field>
              )}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Controller
              control={control}
              name="featured"
              render={({ field }) => (
                <Switch
                  label={PRODUCT_FORM_COPY.featured}
                  ref={field.ref}
                  name={field.name}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  aria-describedby={featuredHintId}
                />
              )}
            />
            <p id={featuredHintId} className="text-xs text-neutral-400">
              {PRODUCT_FORM_COPY.featuredHint}
            </p>
          </div>
        </Section>

        <Section title={PRODUCT_FORM_COPY.statusSection} description={PRODUCT_FORM_COPY.statusHint}>
          {product?.status === 'archived' ? (
            <p className="text-sm">{PRODUCT_FORM_COPY.archived}</p>
          ) : (
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <SegmentedControl
                  label={PRODUCT_FORM_COPY.statusLegend}
                  options={STATUS_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          )}
        </Section>

        <ProductPhotosField
          control={control}
          register={register}
          errors={errors}
          uploads={uploads}
          getProductName={getProductName}
        />

        <ProductTabsFields register={register} errors={errors} group={group} />

        <FormActions
          isDirty={isDirty}
          isSubmitting={save.isPending}
          submitLabel={product === null ? PRODUCT_FORM_COPY.create : undefined}
          onDiscard={() => {
            reset()
            setIsSlugEdited(product !== null)
            clearUploads()
          }}
        />
      </form>
      <UnsavedChangesGuard when={(isDirty || uploads.items.length > 0) && createdId === null} />
      <ConfirmDialog
        open={conflict !== null}
        onOpenChange={(open) => {
          if (!open) void showSavedVersion()
        }}
        title={PRODUCT_FORM_COPY.changedTitle}
        description={PRODUCT_FORM_COPY.changedDescription}
        confirmLabel={PRODUCT_FORM_COPY.saveAnyway}
        cancelLabel={PRODUCT_FORM_COPY.viewSaved}
        tone="danger"
        isPending={save.isPending}
        onConfirm={() => {
          if (conflict !== null) saveValues(conflict, true)
        }}
      />
    </>
  )
}
