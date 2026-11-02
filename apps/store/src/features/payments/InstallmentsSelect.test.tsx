// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { InstallmentOption } from '@galpon/api-client'
import { installmentOptionLabel, InstallmentsSelect } from './InstallmentsSelect'
import { PAYMENTS_COPY } from './payments.copy'

afterEach(cleanup)

/** Arma una opción de cuotas como la devuelve `getInstallments`. */
function option(
  installments: number,
  installmentAmountArs: number,
  totalArs: number,
  cftPercent = 0,
  teaPercent = 0,
): InstallmentOption {
  return { installments, installmentAmountArs, totalArs, cftPercent, teaPercent, label: 'del back' }
}

const OPTIONS = [
  option(1, 68397, 68397),
  option(3, 22799, 68397),
  option(6, 13314, 79884, 45.9, 38),
]

describe('installmentOptionLabel', () => {
  it('1 pago muestra solo el monto', () => {
    expect(installmentOptionLabel(option(1, 68397, 68397))).toBe('1 pago de $68.397')
  })

  it('con CFT 0 dice "sin interés" y muestra CFT y TEA', () => {
    expect(installmentOptionLabel(option(3, 22799, 68397))).toBe(
      '3 cuotas sin interés de $22.799 · CFT 0,00 % (TEA 0,00 %)',
    )
  })

  it('con interés muestra la cuota, el total, el CFT y la TEA', () => {
    expect(installmentOptionLabel(option(6, 13314, 79884, 45.9, 38))).toBe(
      '6 cuotas de $13.314 · Total $79.884 · CFT 45,90 % (TEA 38,00 %)',
    )
  })

  it('solo dice "sin interés" con CFT 0, aunque la TEA sea 0', () => {
    const label = installmentOptionLabel(option(3, 23500, 70500, 3.07, 0))
    expect(label).toBe('3 cuotas de $23.500 · Total $70.500 · CFT 3,07 % (TEA 0,00 %)')
    expect(label).not.toContain('sin interés')
  })

  it('rechaza una cantidad de cuotas que no es un entero desde 1', () => {
    expect(() => installmentOptionLabel(option(0, 1, 1))).toThrow(RangeError)
  })
})

describe('InstallmentsSelect', () => {
  it('lista las opciones del back y avisa la elegida', async () => {
    const onChange = vi.fn()
    render(<InstallmentsSelect options={OPTIONS} value={1} onChange={onChange} />)

    const select = screen.getByRole('combobox', { name: PAYMENTS_COPY.installments })
    expect(screen.getAllByRole('option').map((element) => element.textContent)).toEqual([
      '1 pago de $68.397',
      '3 cuotas sin interés de $22.799 · CFT 0,00 % (TEA 0,00 %)',
      '6 cuotas de $13.314 · Total $79.884 · CFT 45,90 % (TEA 38,00 %)',
    ])
    await userEvent.setup().selectOptions(select, '6')
    expect(onChange).toHaveBeenCalledWith(6)
  })

  it('destaca el CFT de la opción elegida con letra mayor que la TEA', () => {
    render(<InstallmentsSelect options={OPTIONS} value={6} onChange={vi.fn()} />)

    const cft = screen.getByText('CFT 45,90 %')
    const tea = screen.getByText('(TEA 38,00 %)')
    expect(cft.tagName).toBe('STRONG')
    expect(tea.tagName).toBe('SMALL')
  })

  it('sin opciones todavía queda deshabilitado con un aviso', () => {
    render(<InstallmentsSelect options={null} value={1} onChange={vi.fn()} />)

    const select = screen.getByRole('combobox', { name: PAYMENTS_COPY.installments })
    expect(select).toBeDisabled()
    expect(screen.getByRole('option')).toHaveTextContent(PAYMENTS_COPY.installmentsPending)
  })
})
