import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ImageDropzone } from './ImageDropzone'

function photo(name: string): File {
  return new File(['x'], name, { type: 'image/jpeg' })
}

describe('ImageDropzone', () => {
  it('múltiple: textos en plural, ayuda y error asociados al botón', () => {
    render(
      <ImageDropzone multiple hint="JPG, PNG o WebP." error="Ya hay 8 fotos." onFiles={vi.fn()} />,
    )

    expect(screen.getByText('Arrastrá fotos acá o elegí archivos')).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'Elegir archivos' })
    expect(button).toHaveAccessibleDescription('JPG, PNG o WebP. Ya hay 8 fotos.')
    expect(screen.getByRole('alert')).toHaveTextContent('Ya hay 8 fotos.')
    const input = screen.getByLabelText('Elegir archivos')
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
    expect(input).toHaveAttribute('multiple')
  })

  it('el botón abre el selector y elegir archivos llama a onFiles', async () => {
    const user = userEvent.setup()
    const onFiles = vi.fn()
    render(<ImageDropzone multiple onFiles={onFiles} />)
    const input = screen.getByLabelText<HTMLInputElement>('Elegir archivos')
    const click = vi.spyOn(input, 'click')

    await user.click(screen.getByRole('button', { name: 'Elegir archivos' }))
    expect(click).toHaveBeenCalledTimes(1)

    const files = [photo('a.jpg'), photo('b.jpg')]
    await user.upload(input, files)
    expect(onFiles).toHaveBeenCalledWith(files)
    expect(input.value).toBe('')
  })

  it('una sola: textos en singular', () => {
    render(<ImageDropzone multiple={false} onFiles={vi.fn()} />)

    expect(screen.getByText('Arrastrá una foto acá o elegí un archivo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Elegir archivo' })).toBeInTheDocument()
    expect(screen.getByLabelText('Elegir archivo')).not.toHaveAttribute('multiple')
  })

  it('soltar archivos llama a onFiles y el borde cambia a accent al arrastrar encima', () => {
    const onFiles = vi.fn()
    render(<ImageDropzone multiple onFiles={onFiles} />)
    const zone = screen.getByText('Arrastrá fotos acá o elegí archivos').parentElement
    if (zone === null) throw new Error('Falta el área de la zona.')
    const files = [photo('a.jpg'), photo('b.jpg')]

    expect(zone).toHaveClass('border-dashed', 'border-divider')
    fireEvent.dragOver(zone, { dataTransfer: { files: [], types: ['Files'] } })
    expect(zone).toHaveClass('border-accent')

    fireEvent.drop(zone, { dataTransfer: { files, types: ['Files'] } })
    expect(onFiles).toHaveBeenCalledWith(files)
    expect(zone).toHaveClass('border-divider')
  })

  it('una sola: al soltar varias solo pasa la primera', () => {
    const onFiles = vi.fn()
    render(<ImageDropzone multiple={false} onFiles={onFiles} />)
    const zone = screen.getByText('Arrastrá una foto acá o elegí un archivo').parentElement
    if (zone === null) throw new Error('Falta el área de la zona.')
    const files = [photo('a.jpg'), photo('b.jpg')]

    fireEvent.drop(zone, { dataTransfer: { files, types: ['Files'] } })

    expect(onFiles).toHaveBeenCalledWith([files[0]])
  })

  it('deshabilitada no acepta archivos', () => {
    const onFiles = vi.fn()
    render(<ImageDropzone multiple disabled onFiles={onFiles} />)
    const zone = screen.getByText('Arrastrá fotos acá o elegí archivos').parentElement
    if (zone === null) throw new Error('Falta el área de la zona.')

    expect(screen.getByRole('button', { name: 'Elegir archivos' })).toBeDisabled()
    fireEvent.drop(zone, { dataTransfer: { files: [photo('a.jpg')], types: ['Files'] } })
    expect(onFiles).not.toHaveBeenCalled()
  })
})
