import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SingleImageFieldProps } from './SingleImageField'
import { SingleImageField } from './SingleImageField'

function renderField(props: Partial<SingleImageFieldProps> = {}) {
  const handlers = {
    onFiles: vi.fn(),
    onCancel: vi.fn(),
    onRetry: vi.fn(),
    onRemove: vi.fn(),
  }
  render(
    <SingleImageField
      label="Foto"
      hint="JPG, PNG o WebP."
      image={null}
      upload={null}
      altField={<input aria-label="Texto alternativo" />}
      {...handlers}
      {...props}
    />,
  )
  return handlers
}

describe('SingleImageField', () => {
  it('sin foto muestra la zona para elegir una', () => {
    renderField()

    expect(screen.getByRole('group', { name: 'Foto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Elegir archivo' })).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('con foto muestra la miniatura, el texto alternativo y "Cambiar foto"', async () => {
    const user = userEvent.setup()
    const { onFiles, onRemove } = renderField({
      image: { src: 'data:image/webp;base64,AAAA', alt: 'Socio en el galpón' },
    })

    expect(screen.getByRole('img', { name: 'Socio en el galpón' })).toBeInTheDocument()
    expect(screen.getByLabelText('Texto alternativo')).toBeInTheDocument()

    const file = new File(['x'], 'nueva.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText('Cambiar foto'), file)
    expect(onFiles).toHaveBeenCalledWith([file])

    await user.click(screen.getByRole('button', { name: 'Quitar foto' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('sin foto muestra el error de la última elección debajo de la zona', () => {
    renderField({ error: 'mate.gif: Formato no admitido: usá JPG, PNG o WebP.' })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'mate.gif: Formato no admitido: usá JPG, PNG o WebP.',
    )
    expect(screen.getByRole('button', { name: 'Elegir archivo' })).toHaveAccessibleDescription(
      'JPG, PNG o WebP. mate.gif: Formato no admitido: usá JPG, PNG o WebP.',
    )
  })

  it('con foto muestra el error de la última elección junto a "Cambiar foto"', () => {
    renderField({
      image: { src: 'data:image/webp;base64,AAAA', alt: 'Socio en el galpón' },
      error: 'grande.jpg: La foto pesa más de 10 MB.',
    })

    expect(screen.getByRole('alert')).toHaveTextContent('grande.jpg: La foto pesa más de 10 MB.')
    expect(screen.getByRole('button', { name: 'Cambiar foto' })).toHaveAccessibleDescription(
      'JPG, PNG o WebP. grande.jpg: La foto pesa más de 10 MB.',
    )
  })

  it('mientras sube muestra la vista previa con el progreso y no deja cambiar la foto', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderField({
      image: { src: 'data:image/webp;base64,AAAA', alt: 'Anterior' },
      upload: {
        previewUrl: 'blob:http://localhost/mock-3',
        status: 'uploading',
        progress: 60,
        errorMessage: null,
      },
    })

    expect(screen.getByRole('progressbar', { name: 'Subiendo… 60 %' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cambiar foto' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('si la subida falla ofrece reintentar', async () => {
    const user = userEvent.setup()
    const { onRetry } = renderField({
      upload: {
        previewUrl: 'blob:http://localhost/mock-4',
        status: 'error',
        progress: 0,
        errorMessage: 'La subida tardó demasiado.',
      },
    })

    expect(screen.getByRole('alert')).toHaveTextContent('La subida tardó demasiado.')
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
