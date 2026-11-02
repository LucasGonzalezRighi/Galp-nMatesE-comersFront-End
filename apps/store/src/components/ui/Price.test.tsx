// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { pesos } from '@galpon/domain'
import { InstallmentsNote } from './InstallmentsNote'
import { NetPrice } from './NetPrice'
import { Price } from './Price'

afterEach(cleanup)

describe('Price', () => {
  it('formatea el monto con signo pegado y puntos de miles', () => {
    render(<Price amount={pesos(39999)} />)

    expect(screen.getByText('$39.999')).toBeVisible()
  })

  it('acepta un número entero (por ejemplo, el de la API) además de un Pesos', () => {
    render(<Price amount={39999} />)

    expect(screen.getByText('$39.999')).toBeVisible()
  })

  it('muestra "Consultar" cuando no hay precio', () => {
    render(<Price amount={null} />)

    expect(screen.getByText('Consultar')).toBeVisible()
  })

  it('rechaza un monto que no es un entero de pesos', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    expect(() => render(<Price amount={1.5} />)).toThrow(RangeError)

    consoleError.mockRestore()
  })
})

describe('NetPrice', () => {
  it('muestra el precio sin impuestos nacionales', () => {
    const { container } = render(<NetPrice amount={pesos(33057)} />)

    expect(container).toHaveTextContent(/^Precio sin impuestos nacionales: \$33\.057$/)
  })

  it('acepta un número entero además de un Pesos', () => {
    const { container } = render(<NetPrice amount={33057} />)

    expect(container).toHaveTextContent('Precio sin impuestos nacionales: $33.057')
  })

  it('no muestra nada sin monto', () => {
    const { container } = render(<NetPrice amount={null} />)

    expect(container).toBeEmptyDOMElement()
  })
})

describe('InstallmentsNote', () => {
  const installments = { maxWithoutInterest: 3, showOnProduct: true }

  it('muestra las cuotas sin interés con el CFT y la TEA', () => {
    const { container } = render(
      <InstallmentsNote price={pesos(39999)} installments={installments} />,
    )

    expect(container).toHaveTextContent(
      /^o 3 cuotas sin interés de \$13\.333 · CFT 0,00 % \(TEA 0,00 %\)$/,
    )
  })

  it('acepta un número entero además de un Pesos', () => {
    const { container } = render(<InstallmentsNote price={39999} installments={installments} />)

    expect(container).toHaveTextContent('o 3 cuotas sin interés de $13.333')
  })

  it('destaca el CFT y deja la TEA en letra menor', () => {
    render(<InstallmentsNote price={pesos(39999)} installments={installments} />)

    expect(screen.getByText('CFT 0,00 %').tagName).toBe('STRONG')
    expect(screen.getByText('(TEA 0,00 %)')).toBeVisible()
  })

  it('redondea el monto de la cuota al peso más cercano', () => {
    const { container } = render(
      <InstallmentsNote
        price={pesos(10000)}
        installments={{ maxWithoutInterest: 6, showOnProduct: true }}
      />,
    )

    expect(container).toHaveTextContent('o 6 cuotas sin interés de $1.667')
  })

  it.each([
    ['showOnProduct es falso', { maxWithoutInterest: 3, showOnProduct: false }, pesos(39999)],
    ['el máximo es 1', { maxWithoutInterest: 1, showOnProduct: true }, pesos(39999)],
    ['el máximo es 0', { maxWithoutInterest: 0, showOnProduct: true }, pesos(39999)],
    ['no hay precio', { maxWithoutInterest: 3, showOnProduct: true }, null],
  ])('no se muestra si %s', (_name, setting, price) => {
    const { container } = render(<InstallmentsNote price={price} installments={setting} />)

    expect(container).toBeEmptyDOMElement()
  })
})
