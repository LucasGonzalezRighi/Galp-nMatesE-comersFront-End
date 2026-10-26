// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { InstallmentOption } from '@galpon/api-client'
import { parseMockCardToken } from '@galpon/api-client/mock'
import { MESSAGES } from '@galpon/schemas'
import type { CardPaymentFormHandle, CardPaymentFormProps } from './CardPaymentForm'
import { CardPaymentForm } from './CardPaymentForm'
import { PAYMENTS_COPY } from './payments.copy'

afterEach(cleanup)

type User = ReturnType<typeof userEvent.setup>

const CARD_NUMBER = '4509953566233704'

const OPTIONS: InstallmentOption[] = [
  {
    installments: 1,
    installmentAmountArs: 68397,
    totalArs: 68397,
    cftPercent: 0,
    teaPercent: 0,
    label: '',
  },
  {
    installments: 3,
    installmentAmountArs: 22799,
    totalArs: 68397,
    cftPercent: 0,
    teaPercent: 0,
    label: '',
  },
]

/** Dibuja el formulario en modo de prueba con un botón "Pagar" dentro. */
function renderForm(props: Partial<CardPaymentFormProps> = {}) {
  const onSubmit = vi.fn()
  const onBinChange = vi.fn()
  const ref = createRef<CardPaymentFormHandle>()
  render(
    <CardPaymentForm
      ref={ref}
      apiMode="mock"
      publicKey={null}
      installments={OPTIONS}
      onBinChange={onBinChange}
      onSubmit={onSubmit}
      {...props}
    >
      <button type="submit">Pagar</button>
    </CardPaymentForm>,
  )
  return { onSubmit, onBinChange, ref }
}

/** Campo de texto por su etiqueta. */
function field(label: string): HTMLElement {
  return screen.getByLabelText(label)
}

/** Completa los datos de la tarjeta. */
async function fillCard(user: User): Promise<void> {
  await user.type(field(PAYMENTS_COPY.cardNumber), CARD_NUMBER)
  await user.type(field(PAYMENTS_COPY.expirationDate), '1130')
  await user.type(field(PAYMENTS_COPY.securityCode), '123')
}

/** La tarjeta animada (decorativa, oculta para lectores de pantalla). */
function preview(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-card-preview]')
  if (element === null) throw new Error('Falta la tarjeta animada')
  return element
}

describe('CardPaymentForm', () => {
  it('nunca muestra el número de la tarjeta fuera de su campo: solo la marca y el BIN', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(field(PAYMENTS_COPY.cardNumber), CARD_NUMBER)

    expect(preview()).toHaveTextContent('VISA')
    expect(preview()).toHaveTextContent('4509 9535 •••• ••••')
    expect(document.body.innerHTML).not.toContain('6623')
    expect(document.body.innerHTML).not.toContain('3704')
  })

  it('la tarjeta muestra el titular, y vencimiento y CVC fijos, y gira al enfocar el CVC', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(field(PAYMENTS_COPY.cardholderName), 'Juana Pérez')
    await user.type(field(PAYMENTS_COPY.expirationDate), '1130')
    expect(preview()).toHaveTextContent('JUANA PÉREZ')
    expect(preview()).toHaveTextContent(PAYMENTS_COPY.previewExpiration)
    expect(preview()).not.toHaveTextContent('11/30')
    expect(preview()).toHaveAttribute('data-flipped', 'false')

    await user.click(field(PAYMENTS_COPY.securityCode))
    expect(preview()).toHaveAttribute('data-flipped', 'true')
    await user.type(field(PAYMENTS_COPY.securityCode), '987')
    expect(preview()).toHaveTextContent(PAYMENTS_COPY.previewSecurityCode)
    expect(preview()).not.toHaveTextContent('987')
    await user.tab()
    expect(preview()).toHaveAttribute('data-flipped', 'false')
  })

  it('al pagar vacío muestra cada error y lleva el foco al primero', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Pagar' }))

    expect(field(PAYMENTS_COPY.cardNumber)).toHaveFocus()
    expect(screen.getByText(MESSAGES.incompleteCardNumber)).toBeInTheDocument()
    expect(screen.getByText(MESSAGES.invalidCardExpiry)).toBeInTheDocument()
    expect(screen.getByText(MESSAGES.invalidCardCvc)).toBeInTheDocument()
    expect(screen.getByText(MESSAGES.cardholderName)).toBeInTheDocument()
    expect(screen.getByText(MESSAGES.invalidDni)).toBeInTheDocument()
    expect(field(PAYMENTS_COPY.cardNumber)).toHaveAccessibleDescription(
      MESSAGES.incompleteCardNumber,
    )
    expect(field(PAYMENTS_COPY.cardholderName)).toHaveAttribute('aria-invalid', 'true')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('con la tarjeta completa, el foco va al primer error de los datos del titular', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await fillCard(user)
    await user.click(screen.getByRole('button', { name: 'Pagar' }))

    expect(field(PAYMENTS_COPY.cardholderName)).toHaveFocus()
    expect(screen.queryByText(MESSAGES.incompleteCardNumber)).not.toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('los errores aparecen al salir del campo, no mientras se escribe por primera vez', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(field(PAYMENTS_COPY.cardNumber), '4509')
    expect(screen.queryByText(MESSAGES.incompleteCardNumber)).not.toBeInTheDocument()
    await user.tab()
    expect(screen.getByText(MESSAGES.incompleteCardNumber)).toBeInTheDocument()
  })

  it('avisa el BIN para pedir las cuotas y entrega el token con lo que necesita el pago', async () => {
    const user = userEvent.setup()
    const { onSubmit, onBinChange } = renderForm()

    await fillCard(user)
    await user.type(field(PAYMENTS_COPY.cardholderName), 'APRO')
    await user.type(field(PAYMENTS_COPY.identificationNumber), '12.345.678')
    await user.selectOptions(field(PAYMENTS_COPY.installments), '3')
    await user.click(screen.getByRole('button', { name: 'Pagar' }))

    expect(onBinChange).toHaveBeenLastCalledWith({ bin: '45099535', paymentTypeId: 'credit_card' })
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
    const { token, ...submission } = onSubmit.mock.calls[0]?.[0] as Record<string, unknown>
    expect(submission).toEqual({
      paymentMethodId: 'visa',
      issuerId: null,
      installments: 3,
      identification: { type: 'DNI', number: '12345678' },
    })
    expect(parseMockCardToken(String(token))).toEqual({ holder: 'APRO', lastFour: '3704' })
  })

  it('expone createCardToken por su ref: un token nuevo en cada intento', async () => {
    const user = userEvent.setup()
    const { ref } = renderForm()

    const createToken = () => act(() => ref.current?.createCardToken())

    expect(await createToken()).toBeNull()
    await fillCard(user)
    await user.type(field(PAYMENTS_COPY.cardholderName), 'CONT')
    await user.type(field(PAYMENTS_COPY.identificationNumber), '12345678')

    const first = await createToken()
    const second = await createToken()
    expect(first?.token).toBeDefined()
    expect(second?.token).not.toBe(first?.token)
    expect(parseMockCardToken(first?.token ?? '')?.holder).toBe('CONT')
  })

  it('avisa null al borrar el número', async () => {
    const user = userEvent.setup()
    const { onBinChange } = renderForm()

    await user.type(field(PAYMENTS_COPY.cardNumber), CARD_NUMBER)
    await user.clear(field(PAYMENTS_COPY.cardNumber))

    expect(onBinChange).toHaveBeenLastCalledWith(null)
    expect(preview()).toHaveTextContent(PAYMENTS_COPY.previewBrand)
  })
})
