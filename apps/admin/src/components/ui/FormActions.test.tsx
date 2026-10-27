import type { SyntheticEvent } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FormActionsProps } from './FormActions'
import { FormActions } from './FormActions'

/** Dibuja la barra dentro de un formulario y devuelve el espía del envío. */
function renderInForm(props: FormActionsProps) {
  const onSubmit = vi.fn((event: SyntheticEvent) => {
    event.preventDefault()
  })
  render(
    <form aria-label="Producto" onSubmit={onSubmit}>
      <FormActions {...props} />
    </form>,
  )
  return onSubmit
}

describe('FormActions', () => {
  it('sin cambios: no avisa, "Descartar" está deshabilitado y el botón principal envía', async () => {
    const onSubmit = renderInForm({ isDirty: false, isSubmitting: false, onDiscard: vi.fn() })

    expect(screen.queryByText('Cambios sin guardar')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeDisabled()
    const submit = screen.getByRole('button', { name: 'Guardar cambios' })
    expect(submit).toHaveAttribute('type', 'submit')
    await userEvent.click(submit)

    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('con cambios: avisa "Cambios sin guardar" y "Descartar" llama a onDiscard', async () => {
    const onDiscard = vi.fn()
    renderInForm({ isDirty: true, isSubmitting: false, onDiscard, submitLabel: 'Crear producto' })

    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }))

    expect(onDiscard).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Crear producto' })).toBeEnabled()
  })

  it('guardando: el botón principal dice "Guardando…", muestra el spinner y todo queda deshabilitado', () => {
    renderInForm({ isDirty: true, isSubmitting: true, onDiscard: vi.fn() })

    const submit = screen.getByRole('button', { name: 'Guardando…' })
    expect(submit).toBeDisabled()
    expect(submit).toHaveAttribute('aria-busy', 'true')
    expect(submit.querySelector('svg')).toHaveClass('animate-spin')
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeDisabled()
  })

  it('es una barra pegada abajo con fondo background al 90 %', () => {
    renderInForm({ isDirty: false, isSubmitting: false, onDiscard: vi.fn() })

    expect(screen.getByRole('button', { name: 'Descartar' }).closest('.sticky')).toHaveClass(
      'bottom-0',
      'bg-background/90',
    )
  })
})
