import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import type { FaqContent } from '@galpon/api-client'
import type { TestApp } from '../../../test/render'
import { useToastStore } from '../../../components/ui/toast'
import { Toaster } from '../../../components/ui/Toaster'
import { createTestApp, renderWithApp } from '../../../test/render'
import { FaqContentScreen } from './FaqContentScreen'

/** Preguntas cortas para los tests: dos categorías, la primera con dos preguntas. */
const FAQ: FaqContent = {
  categories: [
    {
      id: 'envios',
      label: 'Envíos',
      items: [
        { question: '¿Envían a todo el país?', answer: 'Sí, a las 24 provincias.' },
        { question: '¿Cuánto tarda?', answer: 'De 3 a 6 días hábiles.' },
      ],
    },
    {
      id: 'pagos',
      label: 'Pagos y cuotas',
      items: [{ question: '¿Hay cuotas?', answer: 'Sí, sin interés.' }],
    },
  ],
}

/** App de prueba con las preguntas de {@link FAQ}. */
async function createFaqApp(): Promise<TestApp> {
  const app = await createTestApp()
  app.mockDb.db.content.faq = structuredClone(FAQ)
  return app
}

async function renderFaq(app: TestApp) {
  const result = await renderWithApp(
    <>
      <FaqContentScreen />
      <Toaster />
    </>,
    { app, path: '/contenido/preguntas' },
  )
  await screen.findByRole('region', { name: 'Categorías' })
  return result
}

/** Nombres de las categorías, en el orden en que se ven. */
function categoryNames(): (string | null)[] {
  return within(screen.getByRole('list', { name: 'Categorías' }))
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent)
}

/** Agrega una categoría con su nombre y la primera pregunta completa; devuelve su grupo. */
async function addCategory(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole('button', { name: 'Agregar categoría' }))
  const name = screen.getAllByLabelText('Nombre').at(-1)
  if (name === undefined) throw new Error('Falta el nombre de la categoría nueva.')
  expect(name).toHaveFocus()
  await user.type(name, label)
  const group = screen.getAllByRole('group', { name: label }).at(-1)
  if (group === undefined) throw new Error(`Falta la categoría ${label}.`)
  const question = within(group).getByRole('group', { name: 'Pregunta 1' })
  await user.type(within(question).getByLabelText('Pregunta'), '¿Retiro en el galpón?')
  await user.type(within(question).getByLabelText('Respuesta'), 'Sí, con turno.')
  return group
}

beforeEach(() => {
  useToastStore.setState({ toasts: [] })
})

describe('FaqContentScreen', { timeout: 20_000 }, () => {
  it('carga las categorías con sus preguntas', async () => {
    const app = await createFaqApp()
    await renderFaq(app)

    const nav = screen.getByRole('navigation', { name: 'Secciones del contenido' })
    expect(within(nav).getByRole('link', { name: 'Preguntas' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(categoryNames()).toEqual(['Envíos', 'Pagos y cuotas'])
    const shipping = screen.getByRole('group', { name: 'Envíos' })
    expect(within(shipping).getByLabelText('Identificador')).toHaveValue('envios')
    const first = within(shipping).getByRole('group', { name: 'Pregunta 1' })
    expect(within(first).getByLabelText('Pregunta')).toHaveValue('¿Envían a todo el país?')
    expect(screen.getByRole('button', { name: 'Subir Envíos' })).toBeDisabled()
    // La única pregunta de una categoría no se puede quitar.
    const payments = screen.getByRole('group', { name: 'Pagos y cuotas' })
    expect(
      within(payments).queryByRole('button', { name: 'Quitar la pregunta 1 de Pagos y cuotas' }),
    ).not.toBeInTheDocument()
  })

  it('valida antes de guardar: una respuesta vacía da "Requerido"', async () => {
    const user = userEvent.setup()
    const app = await createFaqApp()
    await renderFaq(app)

    const shipping = screen.getByRole('group', { name: 'Envíos' })
    const second = within(shipping).getByRole('group', { name: 'Pregunta 2' })
    await user.clear(within(second).getByLabelText('Respuesta'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await within(second).findByText('Requerido')).toBeInTheDocument()
    expect(app.mockDb.db.content.faq).toEqual(FAQ)
  })

  it('agrega y quita preguntas y guarda las categorías enteras', async () => {
    const user = userEvent.setup()
    const app = await createFaqApp()
    await renderFaq(app)

    const shipping = screen.getByRole('group', { name: 'Envíos' })
    await user.click(within(shipping).getByRole('button', { name: 'Agregar pregunta' }))
    const added = within(shipping).getByRole('group', { name: 'Pregunta 3' })
    expect(within(added).getByLabelText('Pregunta')).toHaveFocus()
    await user.type(within(added).getByLabelText('Pregunta'), '¿Llega a Ushuaia?')
    await user.type(within(added).getByLabelText('Respuesta'), 'Sí.')
    await user.click(
      within(shipping).getByRole('button', { name: 'Quitar la pregunta 1 de Envíos' }),
    )

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Contenido guardado.')).toBeInTheDocument()
    const [envios, pagos] = FAQ.categories
    expect(app.mockDb.db.content.faq).toEqual({
      categories: [
        {
          ...envios,
          items: [envios?.items[1], { question: '¿Llega a Ushuaia?', answer: 'Sí.' }],
        },
        pagos,
      ],
    })
  })

  it('al quitar una pregunta o una categoría el foco va al primer campo de la que queda', async () => {
    const user = userEvent.setup()
    const app = await createFaqApp()
    await renderFaq(app)

    const shipping = screen.getByRole('group', { name: 'Envíos' })
    await user.click(
      within(shipping).getByRole('button', { name: 'Quitar la pregunta 1 de Envíos' }),
    )
    // La segunda pasa al lugar de la quitada: su "Pregunta" tiene el foco, no el body.
    const question = within(shipping).getByLabelText('Pregunta')
    expect(question).toHaveValue('¿Cuánto tarda?')
    expect(question).toHaveFocus()

    // La última categoría no tiene siguiente: el foco va al nombre de la anterior.
    await user.click(screen.getByRole('button', { name: 'Quitar Pagos y cuotas' }))
    expect(categoryNames()).toEqual(['Envíos'])
    expect(within(shipping).getByLabelText('Nombre')).toHaveFocus()
  })

  it('reordena las categorías con "Bajar" y guarda el orden nuevo', async () => {
    const user = userEvent.setup()
    const app = await createFaqApp()
    await renderFaq(app)

    await user.click(screen.getByRole('button', { name: 'Bajar Envíos' }))
    expect(await screen.findByText('Categorías: quedó en el lugar 2 de 2.')).toBeInTheDocument()
    expect(categoryNames()).toEqual(['Pagos y cuotas', 'Envíos'])
    expect(screen.getByRole('button', { name: 'Arrastrar Envíos' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Contenido guardado.')).toBeInTheDocument()
    expect(app.mockDb.db.content.faq.categories.map((category) => category.id)).toEqual([
      'pagos',
      'envios',
    ])
  })

  it('una categoría nueva toma el identificador del nombre hasta que se lo cambia', async () => {
    const user = userEvent.setup()
    const app = await createFaqApp()
    await renderFaq(app)

    // Una guardada no sigue al nombre: su ayuda no dice que se completa sola.
    const saved = within(screen.getByRole('group', { name: 'Pagos y cuotas' })).getByLabelText(
      'Identificador',
    )
    expect(saved).toHaveAccessibleDescription('Va en la dirección de la página.')
    expect(saved).toHaveClass('font-mono')

    const pickup = await addCategory(user, 'Retiro en persona')
    expect(within(pickup).getByLabelText('Identificador')).toHaveValue('retiro-en-persona')
    expect(within(pickup).getByLabelText('Identificador')).toHaveAccessibleDescription(
      'Va en la dirección de la página. Se completa solo a partir del nombre.',
    )
    await user.clear(within(pickup).getByLabelText('Identificador'))
    await user.type(within(pickup).getByLabelText('Identificador'), 'retiro')
    await user.type(within(pickup).getByLabelText('Nombre'), ' o envío')
    expect(within(pickup).getByLabelText('Identificador')).toHaveValue('retiro')
    expect(within(pickup).getByLabelText('Identificador')).toHaveAccessibleDescription(
      'Va en la dirección de la página.',
    )

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Contenido guardado.')).toBeInTheDocument()
    expect(app.mockDb.db.content.faq.categories.at(-1)).toEqual({
      id: 'retiro',
      label: 'Retiro en persona o envío',
      items: [{ question: '¿Retiro en el galpón?', answer: 'Sí, con turno.' }],
    })
  })

  it('no deja guardar dos categorías con el mismo identificador', async () => {
    const user = userEvent.setup()
    const app = await createFaqApp()
    await renderFaq(app)

    const repeated = await addCategory(user, 'Envíos')
    expect(within(repeated).getByLabelText('Identificador')).toHaveValue('envios')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(
      await within(repeated).findByText('Ya hay otra categoría con este identificador.'),
    ).toBeInTheDocument()
    expect(within(repeated).getByLabelText('Identificador')).toHaveFocus()
    expect(app.mockDb.db.content.faq).toEqual(FAQ)
  })
})
