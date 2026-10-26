// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { CartQuoteLine } from '@galpon/api-client'
import type { CartLine } from '@galpon/domain'
import { buildCartView } from './cart-view'
import { CartLineItem } from './CartLineItem'
import { cartQuote, quoteLine } from './test/support'

afterEach(cleanup)

const mateLine: CartLine = {
  type: 'product',
  productId: 'm1',
  quantity: 1,
  options: { leather: 'Negro', ferrule: 'Alpaca cincelada' },
}
const kitLine: CartLine = {
  type: 'kit',
  mateId: 'm1',
  bombillaId: 'b1',
  yerbaId: 'y1',
  leather: 'Negro',
  quantity: 1,
}

const mateQuote = quoteLine({
  key: 'product:m1:Negro:Alpaca cincelada',
  name: 'Mate Imperial Premium',
  detail: 'Cuero negro · Alpaca cincelada',
  unitPriceArs: 39999,
  totalArs: 39999,
  netUnitPriceArs: 33057,
})
const kitQuote = quoteLine({
  key: 'kit:m1:b1:y1:Negro',
  type: 'kit',
  name: 'Kit',
  detail: 'Mate + Bombillón + Yerba · Cuero negro',
  unitPriceArs: 75997,
  kitSavingsArs: 7600,
  totalArs: 68397,
  netUnitPriceArs: 56526,
})

/** Dibuja la única línea de un carrito cotizado, como la arma el panel. */
function renderLine(line: CartLine, quoted: CartQuoteLine): void {
  const [view] = buildCartView({ lines: [line], quote: cartQuote([quoted]) }).lines
  if (view === undefined) throw new Error('La vista no trae la línea')
  render(
    <ul>
      <CartLineItem line={view} />
    </ul>,
  )
}

describe('CartLineItem', () => {
  it('un kit muestra el precio sin impuestos nacionales por unidad, sin "c/u" si hay una sola', () => {
    renderLine(kitLine, kitQuote)

    expect(screen.getByText('Precio sin impuestos nacionales: $56.526')).toBeVisible()
    expect(screen.getByText('Ahorrás $7.600')).toBeVisible()
    expect(screen.getByText('$68.397')).toBeVisible()
    expect(screen.queryByText('c/u')).not.toBeInTheDocument()
  })

  it('con más de una unidad el precio sin impuestos dice "c/u"', () => {
    renderLine(
      { ...kitLine, quantity: 2 },
      { ...kitQuote, kitSavingsArs: 15200, totalArs: 136794, unitPriceArs: 75997 },
    )

    expect(screen.getByText('Precio sin impuestos nacionales: $56.526')).toBeVisible()
    expect(screen.getByText('c/u')).toBeVisible()
  })

  it('apagado el ajuste, la línea no muestra el precio sin impuestos', () => {
    renderLine(mateLine, { ...mateQuote, netUnitPriceArs: null })

    expect(screen.queryByText(/Precio sin impuestos nacionales/)).not.toBeInTheDocument()
    expect(screen.getByText('$39.999')).toBeVisible()
  })

  it('"quantity_reduced" avisa que se bajó la cantidad por el stock y muestra las unidades cotizadas', () => {
    renderLine(
      { ...mateLine, quantity: 5 },
      { ...mateQuote, issue: 'quantity_reduced', maxQuantity: 2, totalArs: 79998 },
    )

    expect(
      screen.getByText('Mate Imperial Premium: bajamos la cantidad a 2 por el stock'),
    ).toBeVisible()
    expect(screen.getByLabelText('Cantidad')).toHaveTextContent('2')
  })

  it('"price_changed" avisa del cambio de precio y muestra el importe vigente', () => {
    renderLine(mateLine, { ...mateQuote, issue: 'price_changed' })

    expect(screen.getByText('Cambió el precio de Mate Imperial Premium')).toBeVisible()
    expect(screen.getByText('$39.999')).toBeVisible()
  })

  it('una línea sin problemas no muestra ningún aviso', () => {
    renderLine(mateLine, mateQuote)

    expect(screen.queryByText(/Cambió el precio|bajamos la cantidad/)).not.toBeInTheDocument()
  })

  it.each([
    ['sold_out', 'Sin stock'],
    ['unavailable', 'No disponible'],
  ] as const)(
    '"%s" muestra "%s", sin importe ni precio sin impuestos en $0 y sin cantidad',
    (issue, label) => {
      renderLine(mateLine, {
        ...mateQuote,
        issue,
        unitPriceArs: 0,
        totalArs: 0,
        netUnitPriceArs: 0,
        maxQuantity: 0,
      })

      expect(screen.getByText(label)).toBeVisible()
      expect(screen.queryByText(/\$0/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Precio sin impuestos nacionales/)).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Cantidad')).not.toBeInTheDocument()
    },
  )
})
