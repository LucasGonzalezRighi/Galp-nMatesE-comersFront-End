import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { Textarea } from './Textarea'

/** Valores del formulario de prueba. */
interface BioForm {
  bio: string
}

/** Props del formulario de prueba. */
interface RegisteredTextareaProps {
  defaultBio: string
}

/** Formulario mínimo con React Hook Form que registra el `Textarea` y lo puede descartar. */
function RegisteredTextarea({ defaultBio }: RegisteredTextareaProps) {
  const { register, reset } = useForm<BioForm>({ defaultValues: { bio: defaultBio } })
  return (
    <form>
      <Textarea aria-label="Bio" maxLength={10} {...register('bio')} />
      <button
        type="button"
        onClick={() => {
          reset()
        }}
      >
        Descartar
      </button>
    </form>
  )
}

describe('Textarea', () => {
  it('se encuentra por su label y tiene las medidas de .input con alto de 90 px', () => {
    render(<Textarea aria-label="Descripción" />)

    expect(screen.getByLabelText('Descripción')).toHaveClass(
      'bg-surface',
      'border-divider',
      'min-h-[90px]',
      'resize-y',
    )
  })

  it('sin maxLength no muestra contador', () => {
    render(<Textarea aria-label="Descripción" />)

    expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument()
  })

  it('con maxLength cuenta los caracteres y solo se anuncia desde el 90 %', async () => {
    render(<Textarea aria-label="Descripción" maxLength={10} />)

    expect(screen.getByText('0 / 10')).toHaveAttribute('aria-live', 'off')

    await userEvent.type(screen.getByLabelText('Descripción'), 'Yerba mat')

    expect(screen.getByText('9 / 10')).toHaveAttribute('aria-live', 'polite')
  })

  it('cuenta el valor inicial y el controlado', () => {
    const { unmount } = render(
      <Textarea aria-label="Descripción" maxLength={20} defaultValue="Hola" />,
    )
    expect(screen.getByText('4 / 20')).toBeInTheDocument()
    unmount()

    render(<Textarea aria-label="Descripción" maxLength={20} value="Bombilla" readOnly />)
    expect(screen.getByText('8 / 20')).toBeInTheDocument()
  })

  it('con register cuenta el valor que pone React Hook Form, también al descartar', async () => {
    render(<RegisteredTextarea defaultBio="Calabaza" />)
    expect(screen.getByText('8 / 10')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Bio'), 's')
    expect(screen.getByText('9 / 10')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(screen.getByLabelText('Bio')).toHaveValue('Calabaza')
    expect(screen.getByText('8 / 10')).toBeInTheDocument()
  })

  it.each([[0], [-1], [2.5]])('rechaza el maxLength %s con un RangeError en español', (max) => {
    expect(() => render(<Textarea aria-label="Descripción" maxLength={max} />)).toThrow(RangeError)
  })
})
