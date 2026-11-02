// @vitest-environment jsdom
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { parseMockCardToken } from '@galpon/api-client/mock'
import type { PaymentFieldMount, PaymentFieldName } from './payments.types'
import { createPaymentFields } from './create-payment-fields'

const STYLE = {
  color: 'rgb(1, 2, 3)',
  fontFamily: 'Inter',
  fontSize: '14px',
  placeholderColor: 'gray',
}

/** Arma un contenedor por campo, como los del formulario. */
function containers(): Record<PaymentFieldName, PaymentFieldMount> {
  const entry = (field: PaymentFieldName): PaymentFieldMount => {
    const container = document.createElement('div')
    document.body.append(container)
    return { container, placeholder: field, inputId: `input-${field}`, errorId: `error-${field}` }
  }
  return {
    cardNumber: entry('cardNumber'),
    expirationDate: entry('expirationDate'),
    securityCode: entry('securityCode'),
  }
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('createPaymentFields', () => {
  it('en vivo sin clave pública avisa en español', () => {
    expect(() => createPaymentFields({ apiMode: 'live', publicKey: null })).toThrow(RangeError)
    expect(() => createPaymentFields({ apiMode: 'live', publicKey: '  ' })).toThrow(RangeError)
  })

  it('en modo de prueba carga los campos simulados al montar y reenvía sus eventos', async () => {
    const fields = createPaymentFields({ apiMode: 'mock', publicKey: null })
    const bins: (string | null)[] = []
    fields.on('binChange', ({ bin }) => bins.push(bin))

    await expect(
      fields.createCardToken({
        cardholderName: 'APRO',
        identificationType: 'DNI',
        identificationNumber: '12345678',
      }),
    ).rejects.toThrow(RangeError)

    await fields.mount(containers(), { style: STYLE })
    const cardNumber = document.getElementById('input-cardNumber')
    if (cardNumber === null) throw new Error('Falta el campo del número')
    await userEvent.setup().type(cardNumber, '4509953566233704')

    expect(bins.at(-1)).toBe('45099535')
    const token = await fields.createCardToken({
      cardholderName: 'APRO',
      identificationType: 'DNI',
      identificationNumber: '12345678',
    })
    expect(parseMockCardToken(token)?.holder).toBe('APRO')
    await expect(fields.getIdentificationTypes()).resolves.not.toHaveLength(0)
    fields.unmount()
  })

  it('si se desmonta mientras carga y se vuelve a montar, queda montado una sola vez', async () => {
    const fields = createPaymentFields({ apiMode: 'mock', publicKey: null })
    const mounts = containers()

    const first = fields.mount(mounts, { style: STYLE })
    fields.unmount()
    const second = fields.mount(mounts, { style: STYLE })
    await Promise.all([first, second])

    expect(document.querySelectorAll('input')).toHaveLength(3)
    fields.unmount()
    expect(document.querySelectorAll('input')).toHaveLength(0)
  })
})
