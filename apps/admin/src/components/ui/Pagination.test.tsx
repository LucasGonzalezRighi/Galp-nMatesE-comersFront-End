import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('muestra el rango, la página y los dos botones en un nav "Paginación"', () => {
    render(<Pagination page={2} pageSize={20} total={45} onPageChange={vi.fn()} />)

    const nav = screen.getByRole('navigation', { name: 'Paginación' })
    expect(nav).toHaveTextContent('Mostrando 21–40 de 45')
    expect(nav).toHaveTextContent('Página 2 de 3')
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
  })

  it('"Anterior" y "Siguiente" piden la página de al lado', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination page={2} pageSize={20} total={45} onPageChange={onPageChange} />)

    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(onPageChange.mock.calls).toEqual([[1], [3]])
  })

  it('en la primera página "Anterior" está deshabilitado', () => {
    render(<Pagination page={1} pageSize={20} total={45} onPageChange={vi.fn()} />)

    expect(screen.getByText('Mostrando 1–20 de 45')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
  })

  it('en la última página el rango termina en el total y "Siguiente" está deshabilitado', () => {
    render(<Pagination page={3} pageSize={20} total={45} onPageChange={vi.fn()} />)

    expect(screen.getByText('Mostrando 41–45 de 45')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  })

  it.each([
    [0, 20],
    [20, 20],
  ])('no se muestra con una sola página (total %i, de a %i)', (total, pageSize) => {
    const { container } = render(
      <Pagination page={1} pageSize={pageSize} total={total} onPageChange={vi.fn()} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('rechaza página, tamaño o total que no son enteros válidos', () => {
    expect(() =>
      render(<Pagination page={0} pageSize={20} total={45} onPageChange={vi.fn()} />),
    ).toThrow(RangeError)
    expect(() =>
      render(<Pagination page={1} pageSize={0} total={45} onPageChange={vi.fn()} />),
    ).toThrow(RangeError)
    expect(() =>
      render(<Pagination page={1} pageSize={20} total={-1} onPageChange={vi.fn()} />),
    ).toThrow(RangeError)
  })
})
