import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import type { AdminProductQuery, Combo } from '@galpon/api-client'
import type { ComboStatus, ProductGroup } from '@galpon/domain'
import type { ComboForm } from '@galpon/schemas'
import { isApiError } from '@galpon/api-client'
import { adminProductsQuery, useApiClient } from '@galpon/api-client/react'
import { COMBO_STATUSES, PRODUCT_GROUPS } from '@galpon/domain'
import type { SegmentedOption } from '../../../components/ui/SegmentedControl'
import type { SelectOption } from '../../../components/ui/Select'
import type { ComboDialogInput, ComboPiece } from '../combo-form-values'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Dialog } from '../../../components/ui/Dialog'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Field } from '../../../components/ui/Field'
import { MoneyInput } from '../../../components/ui/MoneyInput'
import { SegmentedControl } from '../../../components/ui/SegmentedControl'
import { Select } from '../../../components/ui/Select'
import { Skeleton } from '../../../components/ui/Skeleton'
import { Textarea } from '../../../components/ui/Textarea'
import { TextInput } from '../../../components/ui/TextInput'
import { toast } from '../../../components/ui/toast'
import {
  COMBO_DESCRIPTION_MAX_LENGTH,
  comboDialogSchema,
  comboFormValues,
  comboPieces,
  comboSummary,
  selectedByGroup,
  withPiece,
} from '../combo-form-values'
import { COMBOS_COPY, pieceOptionLabel, summaryText, unavailablePieceLabel } from '../combos.copy'
import { useSaveCombo } from '../use-save-combo'

/** Productos que se pueden elegir como piezas: los publicados (hasta 100, como el inicio). */
const PUBLISHED_PRODUCTS = {
  status: 'published',
  pageSize: 100,
} as const satisfies AdminProductQuery

/** Campos que pueden traer un error del servidor (`422`), con las rutas del contrato. */
const COMBO_FIELDS = ['name', 'description', 'productIds', 'priceArs', 'status'] as const

/** Una ruta de {@link COMBO_FIELDS}. */
type ComboFieldPath = (typeof COMBO_FIELDS)[number]

/** Indica si una ruta de un `422` es la de un campo que el formulario dibuja. */
function isComboFieldPath(path: string): path is ComboFieldPath {
  return (COMBO_FIELDS as readonly string[]).includes(path)
}

/** Indica si una ruta de un `422` es la de una pieza (`productIds.N`). */
function isPiecePath(path: string): path is `productIds.${number}` {
  return /^productIds\.\d+$/.test(path)
}

/** Opciones del estado, en el orden del dominio. */
const STATUS_OPTIONS: readonly SegmentedOption<ComboStatus>[] = COMBO_STATUSES.map((status) => ({
  value: status,
  label: COMBOS_COPY.status[status],
}))

/**
 * Opciones de la lista de un grupo: "Sin {grupo}" y sus piezas, con su precio de lista o, si ya
 * no se venden, marcadas "(no disponible)".
 */
function groupOptions(pieces: readonly ComboPiece[], group: ProductGroup): SelectOption[] {
  return [
    { value: '', label: COMBOS_COPY.form.none[group] },
    ...pieces
      .filter((piece) => piece.group === group)
      .map((piece) => ({
        value: piece.id,
        label:
          piece.isAvailable && piece.priceArs !== null
            ? pieceOptionLabel(piece.name, piece.priceArs)
            : unavailablePieceLabel(piece.name),
      })),
  ]
}

/** Ayuda de la lista de una pieza elegida que no se vende o no tiene stock. */
function pieceHint(piece: ComboPiece | undefined): string | undefined {
  if (piece === undefined) return undefined
  if (!piece.isAvailable) return COMBOS_COPY.form.pieceUnavailable
  return piece.isSoldOut ? COMBOS_COPY.form.pieceSoldOut : undefined
}

/** Listas grises mientras cargan los productos. */
function PiecesSkeleton(): ReactNode {
  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="sr-only">
        {COMBOS_COPY.form.loadingProducts}
      </p>
      {PRODUCT_GROUPS.map((group) => (
        <Skeleton key={group} className="h-9 w-full" />
      ))}
    </div>
  )
}

/** Props de {@link ComboFormDialog}. */
export interface ComboFormDialogProps {
  /** Si está abierto. */
  open: boolean
  /** El combo que se edita, o `null` para crear uno. */
  combo: Combo | null
  /** Se llama para cerrarlo: al guardar, al cancelar sin cambios o al descartarlos. */
  onClose: () => void
}

/**
 * Diálogo "Nuevo combo" / "Editar combo" (`comboDialogSchema`, que es `comboFormSchema` con el
 * precio vacío al empezar): nombre, descripción, una lista por grupo (Mate, Bombilla y Yerba, con
 * los publicados con precio de `adminProductsQuery`; mínimo 2 elegidas), precio final con el
 * resumen en vivo "Suma de las piezas $X · Ahorro $Y" (y un aviso si el precio no es menor que la
 * suma) y estado borrador o publicado.
 *
 * Un `422` va a cada campo (`productIds.N` a la lista de esa pieza, `productIds` debajo de las
 * piezas); otro error, o un `422` con alguna ruta que el formulario no dibuja, también a un toast
 * con su mensaje. Cerrarlo con cambios pregunta "¿Descartar los cambios?". Quien lo usa le cambia
 * la `key` en cada apertura, así arranca de cero.
 *
 * @param props - Ver {@link ComboFormDialogProps}.
 */
export function ComboFormDialog({ open, combo, onClose }: ComboFormDialogProps): ReactNode {
  const api = useApiClient()
  const formId = useId()
  const piecesHintId = useId()
  const piecesErrorId = useId()
  const isNew = combo === null
  const [defaultValues] = useState(() => comboFormValues(combo))
  const [confirmOpen, setConfirmOpen] = useState(false)
  const products = useQuery(adminProductsQuery(api, PUBLISHED_PRODUCTS))
  const save = useSaveCombo(combo?.id ?? null)
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isDirty },
  } = useForm<ComboDialogInput, undefined, ComboForm>({
    resolver: zodResolver(comboDialogSchema),
    defaultValues,
  })
  const productIds = useWatch({ control, name: 'productIds' })
  const priceArs = useWatch({ control, name: 'priceArs' })
  const pieces = products.data === undefined ? [] : comboPieces(products.data.items, combo)
  const selected = selectedByGroup(productIds, pieces)
  const summary = comboSummary(productIds, pieces, priceArs)
  const piecesError = errors.productIds?.message

  const requestClose = () => {
    if (save.isPending) return
    if (isDirty) setConfirmOpen(true)
    else onClose()
  }

  const handleSaveError = (error: unknown) => {
    if (!isApiError(error)) {
      toast.error(COMBOS_COPY.form.saveError)
      return
    }
    // "Tu sesión venció" (401) y el token CSRF rotado (403) los resuelve la estructura.
    if (error.kind === 'unauthorized' || error.kind === 'forbidden') return
    const paths = Object.keys(error.fieldErrors)
    const pieceCount = getValues('productIds').length
    let shown = 0
    for (const path of paths) {
      const message = error.fieldErrors[path]
      if (isComboFieldPath(path)) {
        setError(path, { message })
        shown += 1
      } else if (isPiecePath(path) && Number(path.slice('productIds.'.length)) < pieceCount) {
        setError(path, { message })
        shown += 1
      }
    }
    // Sin campos, o con alguno que el formulario no dibuja: el mensaje general no se pierde.
    if (shown === 0 || shown < paths.length) toast.error(error.message)
  }

  const submit = handleSubmit((values) => {
    save.mutate(values, { onSuccess: onClose, onError: handleSaveError })
  })

  function renderPieces(): ReactNode {
    if (products.data === undefined) {
      if (!products.isError) return <PiecesSkeleton />
      return (
        <ErrorState
          title={COMBOS_COPY.form.productsError}
          onRetry={() => void products.refetch()}
        />
      )
    }
    return (
      <Controller
        control={control}
        name="productIds"
        render={({ field }) => (
          <>
            {PRODUCT_GROUPS.map((group, groupIndex) => {
              const id = selected[group]
              const index = id === '' ? -1 : field.value.indexOf(id)
              return (
                <Field
                  key={group}
                  label={COMBOS_COPY.form.groups[group]}
                  hint={pieceHint(pieces.find((piece) => piece.id === id))}
                  error={index < 0 ? undefined : errors.productIds?.[index]?.message}
                >
                  {(fieldControl) => (
                    <Select
                      {...fieldControl}
                      // El primero recibe el foco si las piezas tienen un error al guardar.
                      ref={groupIndex === 0 ? field.ref : undefined}
                      name={`${field.name}-${group}`}
                      options={groupOptions(pieces, group)}
                      value={id}
                      onBlur={field.onBlur}
                      onChange={(event) => {
                        field.onChange(withPiece(field.value, pieces, group, event.target.value))
                      }}
                    />
                  )}
                </Field>
              )
            })}
          </>
        )}
      />
    )
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose()
        }}
        title={isNew ? COMBOS_COPY.form.createTitle : COMBOS_COPY.form.editTitle}
        footer={
          <>
            <Button variant="secondary" disabled={save.isPending} onClick={requestClose}>
              {COMBOS_COPY.form.cancel}
            </Button>
            <Button type="submit" form={formId} isLoading={save.isPending}>
              {save.isPending ? COMBOS_COPY.form.saving : COMBOS_COPY.form.save}
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
          <Field label={COMBOS_COPY.form.name} error={errors.name?.message} required>
            {(field) => <TextInput {...field} autoComplete="off" {...register('name')} />}
          </Field>
          <Field
            label={COMBOS_COPY.form.description}
            hint={COMBOS_COPY.form.descriptionHint}
            error={errors.description?.message}
          >
            {(field) => (
              <Textarea
                {...field}
                maxLength={COMBO_DESCRIPTION_MAX_LENGTH}
                {...register('description')}
              />
            )}
          </Field>
          <fieldset
            className="flex min-w-0 flex-col gap-3"
            aria-describedby={
              piecesError === undefined ? piecesHintId : `${piecesHintId} ${piecesErrorId}`
            }
          >
            <legend className="mb-1 text-sm font-medium">{COMBOS_COPY.form.pieces}</legend>
            <p id={piecesHintId} className="-mt-2 text-xs text-neutral-400">
              {COMBOS_COPY.form.piecesHint}
            </p>
            {renderPieces()}
            {piecesError !== undefined && (
              <p id={piecesErrorId} className="text-danger text-xs">
                {piecesError}
              </p>
            )}
          </fieldset>
          <div className="flex flex-col gap-2">
            <Controller
              control={control}
              name="priceArs"
              render={({ field }) => (
                <Field
                  label={COMBOS_COPY.form.price}
                  hint={COMBOS_COPY.form.priceHint}
                  error={errors.priceArs?.message}
                  required
                >
                  {(fieldControl) => <MoneyInput {...fieldControl} {...field} />}
                </Field>
              )}
            />
            {products.data !== undefined && (
              <div
                aria-live="polite"
                className="flex flex-col gap-1 rounded-md bg-neutral-900 px-3 py-2 text-sm"
              >
                <p className="tabular-nums">
                  {productIds.length === 0
                    ? COMBOS_COPY.form.summaryEmpty
                    : summaryText(summary.listPriceArs, summary.savingsArs)}
                </p>
                {summary.priceNotBelowSum && errors.priceArs === undefined && (
                  <p className="text-danger text-xs">{COMBOS_COPY.form.priceNotBelowSum}</p>
                )}
              </div>
            )}
          </div>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <SegmentedControl
                label={COMBOS_COPY.form.status}
                options={STATUS_OPTIONS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </form>
      </Dialog>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={COMBOS_COPY.discard.title}
        description={COMBOS_COPY.discard.description}
        confirmLabel={COMBOS_COPY.discard.confirm}
        cancelLabel={COMBOS_COPY.discard.keepEditing}
        tone="danger"
        isPending={false}
        onConfirm={() => {
          setConfirmOpen(false)
          onClose()
        }}
      />
    </>
  )
}
