import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ImageTile } from './ImageTile'

describe('ImageTile', () => {
  it('lista: miniatura 4:5, insignia "Principal", "Quitar foto" y el campo del texto alternativo', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(
      <ImageTile
        src="data:image/webp;base64,AAAA"
        alt="Mate imperial"
        status="done"
        isMain
        onRemove={onRemove}
      >
        <label>
          Texto alternativo
          <input defaultValue="Mate imperial" />
        </label>
      </ImageTile>,
    )

    const image = screen.getByRole('img', { name: 'Mate imperial' })
    expect(image).toHaveClass('object-cover')
    expect(image.parentElement).toHaveClass('aspect-[4/5]')
    expect(screen.getByText('Principal')).toBeInTheDocument()
    expect(screen.getByLabelText('Texto alternativo')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Quitar foto' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('subiendo: barra de progreso con "Subiendo… {p} %" y "Cancelar"', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(
      <ImageTile
        src="blob:http://localhost/mock-1"
        alt=""
        status="uploading"
        progress={40}
        onCancel={onCancel}
        onRemove={vi.fn()}
      />,
    )

    const bar = screen.getByRole('progressbar', { name: 'Subiendo… 40 %' })
    expect(bar).toHaveAttribute('aria-valuenow', '40')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
    expect(screen.getByText('Subiendo… 40 %')).toBeInTheDocument()
    expect(screen.queryByText('Principal')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Quitar foto' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('error: el mensaje, "Reintentar" y "Quitar"', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    const onRemove = vi.fn()
    render(
      <ImageTile
        src="blob:http://localhost/mock-2"
        alt=""
        status="error"
        errorMessage="No se pudo subir la foto: revisá la conexión."
        onRetry={onRetry}
        onRemove={onRemove}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo subir la foto: revisá la conexión.',
    )
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await user.click(screen.getByRole('button', { name: 'Quitar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('rechaza un progreso fuera de 0 a 100', () => {
    expect(() =>
      render(
        <ImageTile src="blob:x" alt="" status="uploading" progress={120} onRemove={vi.fn()} />,
      ),
    ).toThrow(RangeError)
  })
})
