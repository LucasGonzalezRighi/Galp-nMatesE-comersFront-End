import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createTestApp, renderWithApp } from '../../test/render'
import { Button } from './Button'
import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  it('pone el título del documento con el sufijo del admin', () => {
    render(<PageHeader title="Pedidos" />)

    expect(document.title).toBe('Pedidos · Galpón Admin')
  })

  it('el título es un h1 text-h3 que puede recibir el foco al navegar', () => {
    render(<PageHeader title="Pedidos" description="Los últimos primero." />)

    const heading = screen.getByRole('heading', { level: 1, name: 'Pedidos' })
    expect(heading).toHaveAttribute('tabindex', '-1')
    expect(heading).toHaveClass('text-h3')
    expect(screen.getByText('Los últimos primero.')).toHaveClass('text-neutral-400')
  })

  it('muestra las acciones', () => {
    render(<PageHeader title="Productos" actions={<Button>Nuevo producto</Button>} />)

    expect(screen.getByRole('button', { name: 'Nuevo producto' })).toBeInTheDocument()
  })

  it('back es un enlace que vuelve a la pantalla anterior', async () => {
    const app = await createTestApp()
    const { router } = await renderWithApp(
      <PageHeader title="Mate imperial" back={{ to: '/productos', label: 'Productos' }} />,
      { app, path: '/productos/1' },
    )

    await userEvent.click(screen.getByRole('link', { name: 'Productos' }))

    expect(router.state.location.pathname).toBe('/productos')
    expect(document.title).toBe('Mate imperial · Galpón Admin')
  })

  it('rechaza un título vacío con un RangeError en español', () => {
    expect(() => render(<PageHeader title="" />)).toThrow(/título/)
  })
})
