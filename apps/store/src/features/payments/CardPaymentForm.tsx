'use client'

import type { ReactNode, Ref } from 'react'
import { useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { ShakeHandle } from '@/components/motion'
import type { ApiMode } from '@/lib/env'
import type { InstallmentOption, InstallmentsInput } from '@galpon/api-client'
import { Shake } from '@/components/motion'
import { Field, Input, Select } from '@/components/ui'
import { cardholderSchema, MESSAGES, toFieldErrors } from '@galpon/schemas'
import type {
  BinChangeEvent,
  IdentificationType,
  PaymentFieldMount,
  PaymentFieldName,
  PaymentFields,
  PaymentFieldStyle,
} from './payments.types'
import { CardPreview } from './CardPreview'
import { createPaymentFields } from './create-payment-fields'
import { InstallmentsSelect } from './InstallmentsSelect'
import { PAYMENTS_COPY } from './payments.copy'
import { SecureField } from './SecureField'

/** Lo que el checkout necesita para cobrar con `payWithCard` (le suma el email del pagador). */
export interface CardPaymentSubmission {
  /** Token de un solo uso de la tarjeta; cada intento lleva uno nuevo. */
  token: string
  /** Marca según Mercado Pago, por ejemplo `visa`. */
  paymentMethodId: string
  /** Banco emisor, o `null` si la tarjeta no necesita elegirlo. */
  issuerId: string | null
  /** Cantidad de cuotas elegida (1 con débito). */
  installments: number
  /** Documento del titular, ya normalizado (el DNI sin puntos). */
  identification: { type: string; number: string }
}

/** Lo que expone {@link CardPaymentForm} por su `ref`. */
export interface CardPaymentFormHandle {
  /**
   * Valida el formulario y, si está completo, pide un token nuevo. Si algo falta, muestra los
   * errores, hace temblar los campos y lleva el foco al primero.
   *
   * @returns Los datos del pago, o `null` si hay errores o no se pudo crear el token.
   */
  createCardToken: () => Promise<CardPaymentSubmission | null>
}

/** Props de {@link CardPaymentForm}. */
export interface CardPaymentFormProps {
  /** Modo de la API (desde el servidor): `mock` usa campos simulados y `live` los de Mercado Pago. */
  apiMode: ApiMode
  /** Clave pública de Mercado Pago (desde el servidor, `getStoreEnv().mpPublicKey`). */
  publicKey: string | null
  /** Cuotas de `getInstallments` para la tarjeta, o `null` mientras no se conocen. */
  installments: readonly InstallmentOption[] | null
  /** Avisa el BIN y el tipo de tarjeta para pedir las cuotas, o `null` cuando ya no hay BIN. */
  onBinChange?: (input: InstallmentsInput | null) => void
  /** Recibe los datos del pago al enviar el formulario completo. */
  onSubmit?: (submission: CardPaymentSubmission) => void | Promise<void>
  /** Referencia para pedir el token desde afuera del formulario. */
  ref?: Ref<CardPaymentFormHandle>
  /** Id del `<form>`, para que un botón de afuera lo envíe con el atributo `form`. */
  id?: string
  /** Contenido al final del formulario, por ejemplo los avisos legales y el botón "Pagar". */
  children?: ReactNode
}

/** Datos del titular que escribe la persona. */
interface HolderValues {
  cardholderName: string
  identificationType: string
  identificationNumber: string
}

/** Campos propios del formulario (no los de la tarjeta). */
type HolderField = keyof HolderValues

/** Todos los campos, en el orden en que aparecen: el foco va al primero con error. */
type FormField = PaymentFieldName | HolderField

/** Orden de los campos en pantalla. */
const FIELD_ORDER: readonly FormField[] = [
  'cardNumber',
  'cardholderName',
  'expirationDate',
  'securityCode',
  'identificationType',
  'identificationNumber',
]

/** Tipo de documento por defecto (spec 14.4). */
const DEFAULT_IDENTIFICATION: IdentificationType = { id: 'DNI', name: 'DNI' }

/** Etiqueta y ayuda de cada campo de la tarjeta. */
const SECURE_FIELDS: Record<PaymentFieldName, { label: string; placeholder: string }> = {
  cardNumber: { label: PAYMENTS_COPY.cardNumber, placeholder: PAYMENTS_COPY.cardNumberPlaceholder },
  expirationDate: {
    label: PAYMENTS_COPY.expirationDate,
    placeholder: PAYMENTS_COPY.expirationDatePlaceholder,
  },
  securityCode: {
    label: PAYMENTS_COPY.securityCode,
    placeholder: PAYMENTS_COPY.securityCodePlaceholder,
  },
}

/** Lee del contenedor el estilo del texto, para los iframes que no ven el CSS de la página. */
function readFieldStyle(element: HTMLElement): PaymentFieldStyle {
  const computed = getComputedStyle(element)
  return {
    color: computed.color,
    fontFamily: computed.fontFamily,
    fontSize: computed.fontSize === '' ? '14px' : computed.fontSize,
    placeholderColor:
      computed.getPropertyValue('--color-neutral-500').trim() === ''
        ? computed.color
        : computed.getPropertyValue('--color-neutral-500').trim(),
  }
}

/** Ids de los campos de la tarjeta, válidos como id de HTML y de selector CSS. */
function secureIds(base: string, field: PaymentFieldName) {
  return {
    containerId: `${base}-${field}`,
    inputId: `${base}-${field}-input`,
    errorId: `${base}-${field}-error`,
  }
}

/**
 * Formulario de pago con tarjeta (spec 14.4): número, titular, vencimiento, CVC, tipo y número de
 * documento, y cuotas, junto a la tarjeta animada del diseño. Los campos de la tarjeta vienen de
 * {@link PaymentFields} (Secure Fields en vivo, simulados en modo de prueba), así que el número
 * nunca aparece fuera de su campo. Los errores se muestran al salir del campo o al enviar, con
 * `aria-live` y temblor, y el foco va al primero.
 *
 * No llama a la API: las cuotas llegan por prop (el checkout las pide con `onBinChange`), y el
 * token se entrega con `onSubmit` o con `createCardToken` por la `ref`.
 *
 * @param props - Ver {@link CardPaymentFormProps}.
 */
export function CardPaymentForm({
  apiMode,
  publicKey,
  installments,
  onBinChange,
  onSubmit,
  ref,
  id,
  children,
}: CardPaymentFormProps): ReactNode {
  const base = `card-${useId().replace(/[^\w-]/g, '')}`
  const [holder, setHolder] = useState<HolderValues>({
    cardholderName: '',
    identificationType: DEFAULT_IDENTIFICATION.id,
    identificationNumber: '',
  })
  const [identificationTypes, setIdentificationTypes] = useState<readonly IdentificationType[]>([
    DEFAULT_IDENTIFICATION,
  ])
  const [touched, setTouched] = useState<ReadonlySet<FormField>>(new Set())
  const [validity, setValidity] = useState<Record<PaymentFieldName, boolean>>({
    cardNumber: false,
    expirationDate: false,
    securityCode: false,
  })
  const [card, setCard] = useState<BinChangeEvent>({ bin: null, method: null })
  const [flipped, setFlipped] = useState(false)
  const [selectedInstallments, setSelectedInstallments] = useState(1)
  const [formError, setFormError] = useState<string | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  // Sin clave pública en vivo no hay campos: el formulario lo avisa en lugar de romperse.
  const fields = useMemo<PaymentFields | null>(() => {
    try {
      return createPaymentFields({ apiMode, publicKey })
    } catch {
      return null
    }
  }, [apiMode, publicKey])
  const containers = useRef<Partial<Record<PaymentFieldName, HTMLDivElement | null>>>({})
  const holderInputs = useRef<Partial<Record<HolderField, HTMLElement | null>>>({})
  const shakes = useRef<Partial<Record<FormField, ShakeHandle | null>>>({})
  const onBinChangeRef = useRef(onBinChange)
  useEffect(() => {
    onBinChangeRef.current = onBinChange
  })

  const markTouched = (field: FormField): void => {
    setTouched((current) => (current.has(field) ? current : new Set(current).add(field)))
  }

  useEffect(() => {
    const mountOf = (field: PaymentFieldName): PaymentFieldMount | null => {
      const container = containers.current[field]
      if (container == null) return null
      return { container, placeholder: SECURE_FIELDS[field].placeholder, ...secureIds(base, field) }
    }
    const cardNumber = mountOf('cardNumber')
    const expirationDate = mountOf('expirationDate')
    const securityCode = mountOf('securityCode')
    if (
      fields === null ||
      cardNumber === null ||
      expirationDate === null ||
      securityCode === null
    ) {
      return
    }
    let active = true
    fields.on('binChange', (event) => {
      setCard(event)
      onBinChangeRef.current?.(
        event.bin === null || event.method === null
          ? null
          : { bin: event.bin, paymentTypeId: event.method.paymentTypeId },
      )
    })
    fields.on('validityChange', ({ field, valid }) => {
      setValidity((current) =>
        current[field] === valid ? current : { ...current, [field]: valid },
      )
    })
    fields.on('focus', ({ field }) => {
      if (field === 'securityCode') setFlipped(true)
    })
    fields.on('blur', ({ field }) => {
      if (field === 'securityCode') setFlipped(false)
      setTouched((current) => (current.has(field) ? current : new Set(current).add(field)))
    })

    const applyTypes = (types: IdentificationType[]): void => {
      const first = types[0]
      if (!active || first === undefined) return
      setIdentificationTypes(types)
      setHolder((current) =>
        types.some((type) => type.id === current.identificationType)
          ? current
          : { ...current, identificationType: first.id },
      )
    }
    void fields
      .mount(
        { cardNumber, expirationDate, securityCode },
        { style: readFieldStyle(cardNumber.container) },
      )
      .then(
        // Si no llegan los tipos de documento, queda DNI: no hace falta frenar el pago.
        () => fields.getIdentificationTypes().then(applyTypes, () => undefined),
        () => {
          if (active) setLoadFailed(true)
        },
      )

    return () => {
      active = false
      fields.unmount()
    }
  }, [fields, base])

  const holderErrors = useMemo(() => {
    const parsed = cardholderSchema.safeParse(holder)
    return parsed.success ? {} : toFieldErrors(parsed.error)
  }, [holder])

  const errors: Record<FormField, string | null> = {
    cardNumber: validity.cardNumber && card.method !== null ? null : MESSAGES.incompleteCardNumber,
    expirationDate: validity.expirationDate ? null : MESSAGES.invalidCardExpiry,
    securityCode: validity.securityCode ? null : MESSAGES.invalidCardCvc,
    cardholderName: holderErrors.cardholderName ?? null,
    identificationType: holderErrors.identificationType ?? null,
    identificationNumber: holderErrors.identificationNumber ?? null,
  }
  const shown = (field: FormField): string | null => (touched.has(field) ? errors[field] : null)

  const isDebit = card.method?.paymentTypeId === 'debit_card'
  const chosenInstallments =
    isDebit || installments === null
      ? 1
      : installments.some((option) => option.installments === selectedInstallments)
        ? selectedInstallments
        : (installments[0]?.installments ?? 1)

  const focusField = (field: FormField): void => {
    if (field === 'cardNumber' || field === 'expirationDate' || field === 'securityCode') {
      fields?.focus(field)
    } else {
      holderInputs.current[field]?.focus()
    }
  }

  const createCardToken = async (): Promise<CardPaymentSubmission | null> => {
    setTouched(new Set(FIELD_ORDER))
    setFormError(null)
    const invalid = FIELD_ORDER.filter((field) => errors[field] !== null)
    const parsed = cardholderSchema.safeParse(holder)
    const method = card.method
    const [first] = invalid
    if (first !== undefined || !parsed.success || method === null || fields === null) {
      for (const field of invalid) shakes.current[field]?.shake()
      if (first !== undefined) focusField(first)
      return null
    }
    setBusy(true)
    try {
      const token = await fields.createCardToken(parsed.data)
      return {
        token,
        paymentMethodId: method.paymentMethodId,
        issuerId: method.issuerId,
        installments: chosenInstallments,
        identification: {
          type: parsed.data.identificationType,
          number: parsed.data.identificationNumber,
        },
      }
    } catch {
      setFormError(PAYMENTS_COPY.tokenError)
      return null
    } finally {
      setBusy(false)
    }
  }

  useImperativeHandle(ref, () => ({ createCardToken }))

  const secureField = (field: PaymentFieldName, className?: string): ReactNode => (
    <SecureField
      label={SECURE_FIELDS[field].label}
      {...secureIds(base, field)}
      error={shown(field)}
      className={className}
      containerRef={(element) => {
        containers.current[field] = element
      }}
      shakeRef={(handle) => {
        shakes.current[field] = handle
      }}
    />
  )

  const updateHolder = (field: HolderField, value: string): void => {
    setHolder((current) => ({ ...current, [field]: value }))
  }

  return (
    <form
      id={id}
      noValidate
      aria-busy={busy}
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        void createCardToken().then((submission) =>
          submission === null ? undefined : onSubmit?.(submission),
        )
      }}
    >
      <div className="flex flex-wrap items-start gap-7">
        <CardPreview
          brand={card.method?.name ?? null}
          bin={card.bin}
          cardholderName={holder.cardholderName}
          flipped={flipped}
        />
        <div className="grid min-w-0 flex-[1_1_260px] grid-cols-2 gap-3.5">
          {secureField('cardNumber', 'col-span-2')}
          <Shake
            ref={(handle) => {
              shakes.current.cardholderName = handle
            }}
            className="col-span-2"
          >
            <Field label={PAYMENTS_COPY.cardholderName} error={shown('cardholderName')}>
              {(control) => (
                <Input
                  {...control}
                  ref={(element) => {
                    holderInputs.current.cardholderName = element
                  }}
                  autoComplete="cc-name"
                  value={holder.cardholderName}
                  onChange={(event) => {
                    updateHolder('cardholderName', event.target.value)
                  }}
                  onBlur={() => {
                    markTouched('cardholderName')
                  }}
                />
              )}
            </Field>
          </Shake>
          {secureField('expirationDate')}
          {secureField('securityCode')}
          <Shake
            ref={(handle) => {
              shakes.current.identificationType = handle
            }}
          >
            <Field label={PAYMENTS_COPY.identificationType} error={shown('identificationType')}>
              {(control) => (
                <Select
                  {...control}
                  ref={(element) => {
                    holderInputs.current.identificationType = element
                  }}
                  value={holder.identificationType}
                  onChange={(event) => {
                    updateHolder('identificationType', event.target.value)
                  }}
                  onBlur={() => {
                    markTouched('identificationType')
                  }}
                >
                  {identificationTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </Shake>
          <Shake
            ref={(handle) => {
              shakes.current.identificationNumber = handle
            }}
          >
            <Field label={PAYMENTS_COPY.identificationNumber} error={shown('identificationNumber')}>
              {(control) => (
                <Input
                  {...control}
                  ref={(element) => {
                    holderInputs.current.identificationNumber = element
                  }}
                  inputMode={holder.identificationType === 'DNI' ? 'numeric' : 'text'}
                  autoComplete="off"
                  value={holder.identificationNumber}
                  onChange={(event) => {
                    updateHolder('identificationNumber', event.target.value)
                  }}
                  onBlur={() => {
                    markTouched('identificationNumber')
                  }}
                />
              )}
            </Field>
          </Shake>
          {isDebit ? null : (
            <InstallmentsSelect
              className="col-span-2"
              options={installments}
              value={chosenInstallments}
              onChange={setSelectedInstallments}
            />
          )}
        </div>
      </div>
      {fields === null || loadFailed ? (
        <p role="alert" className="text-danger m-0 text-[13px]">
          {PAYMENTS_COPY.loadError}
        </p>
      ) : formError === null ? null : (
        <p role="alert" className="text-danger m-0 text-[13px]">
          {formError}
        </p>
      )}
      {children}
    </form>
  )
}
