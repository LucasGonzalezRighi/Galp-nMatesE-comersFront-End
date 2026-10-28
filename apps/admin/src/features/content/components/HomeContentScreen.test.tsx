import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import type { HomeContent } from '@galpon/api-client'
import type { TestApp } from '../../../test/render'
import { useToastStore } from '../../../components/ui/toast'
import { Toaster } from '../../../components/ui/Toaster'
import { failBackgroundReload } from '../../../test/fail-background-reload'
import { createTestApp, renderWithApp } from '../../../test/render'
import { HomeContentScreen } from './HomeContentScreen'

async function renderHome(app: TestApp) {
  const result = await renderWithApp(
    <>
      <HomeContentScreen />
      <Toaster />
    </>,
    { app, path: '/contenido/inicio' },
  )
  await screen.findByRole('region', { name: 'Portada' })
  return result
}

/** Una copia del inicio guardado, para armar lo que se espera después de guardar. */
function savedHome(app: TestApp): HomeContent {
  return structuredClone(app.mockDb.db.content.home)
}

beforeEach(() => {
  useToastStore.setState({ toasts: [] })
})

describe('HomeContentScreen', () => {
  it('carga los textos, las escenas y los productos publicados de cada grupo', async () => {
    const app = await createTestApp()
    await renderHome(app)

    expect(screen.getByRole('heading', { level: 1, name: 'Contenido' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Los textos se muestran tal cual, sin formato. Para separar párrafos, dejá una línea en blanco.',
      ),
    ).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Secciones del contenido' })
    expect(within(nav).getByRole('link', { name: 'Inicio' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(nav).getByRole('link', { name: 'Nosotros' })).not.toHaveAttribute('aria-current')
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Inicio', 'Nosotros', 'Preguntas', 'Pestañas', 'Pie', 'Legales'])

    const hero = screen.getByRole('region', { name: 'Portada' })
    expect(within(hero).getByLabelText('Antetítulo')).toHaveValue('Hechos para compartir')
    expect(within(hero).getByLabelText('Línea 1')).toHaveValue('Encontrá')
    expect(within(hero).getByLabelText('Línea 2')).toHaveValue('tu mate.')

    const story = screen.getByRole('region', { name: 'Historia' })
    expect(
      within(story)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(['Las piezas', 'La calabaza', 'La bombilla', 'La yerba', 'El ritual', 'El cuero'])
    const gourd = within(story).getByRole('group', { name: 'La calabaza' })
    expect(within(gourd).getByLabelText('Botón (opcional)')).toHaveValue('Ver mates')
    const pieces = within(story).getByRole('group', { name: 'Las piezas' })
    expect(within(pieces).getByLabelText('Botón (opcional)')).toHaveValue('')

    const products = screen.getByRole('region', { name: 'Productos de la historia' })
    const heroMate = within(products).getByLabelText('Mate de la portada')
    expect(heroMate).toHaveValue('mate-imperial-premium')
    const mateOptions = within(heroMate)
      .getAllByRole('option')
      .map((option) => option.getAttribute('value'))
    expect(mateOptions).not.toContain('bombillon-premium-curvo')
    expect(mateOptions).not.toContain('yerba-canarias-1-kg')
    expect(within(products).getByLabelText('Bombilla 2')).toHaveValue('bombillon-100-alpaca')
    expect(within(products).getByLabelText('Yerba 3')).toHaveValue(
      'yerba-canarias-te-y-jengibre-1-kg',
    )

    const stats = screen.getByRole('region', { name: 'Cifras' })
    expect(within(stats).getByLabelText('Provincias con envío')).toHaveValue('24')
  })

  it('valida antes de guardar: un antetítulo vacío da "Requerido" y no hace el PUT', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    const before = savedHome(app)
    await renderHome(app)

    const hero = screen.getByRole('region', { name: 'Portada' })
    await user.clear(within(hero).getByLabelText('Antetítulo'))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await within(hero).findByText('Requerido')).toBeInTheDocument()
    expect(within(hero).getByLabelText('Antetítulo')).toHaveFocus()
    expect(app.mockDb.db.content.home).toEqual(before)
  })

  it('agrega y quita líneas del título, de 1 a 3', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    await renderHome(app)

    const hero = screen.getByRole('region', { name: 'Portada' })
    await user.click(within(hero).getByRole('button', { name: 'Agregar línea' }))
    expect(within(hero).getByLabelText('Línea 3')).toHaveFocus()
    expect(within(hero).queryByRole('button', { name: 'Agregar línea' })).not.toBeInTheDocument()
    await user.type(within(hero).getByLabelText('Línea 3'), 'de siempre.')

    await user.click(within(hero).getByRole('button', { name: 'Quitar la línea 1' }))
    expect(within(hero).getByLabelText('Línea 1')).toHaveValue('tu mate.')
    expect(within(hero).getByLabelText('Línea 2')).toHaveValue('de siempre.')
    expect(within(hero).queryByLabelText('Línea 3')).not.toBeInTheDocument()

    await user.click(within(hero).getByRole('button', { name: 'Quitar la línea 2' }))
    expect(
      within(hero).queryByRole('button', { name: 'Quitar la línea 1' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Contenido guardado.')).toBeInTheDocument()
    expect(app.mockDb.db.content.home.hero.titleLines).toEqual(['tu mate.'])
  })

  it('guarda la página entera: escenas, productos y cifras', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    const expected = savedHome(app)
    await renderHome(app)

    const story = screen.getByRole('region', { name: 'Historia' })
    const gourd = within(story).getByRole('group', { name: 'La calabaza' })
    await user.clear(within(gourd).getByLabelText('Botón (opcional)'))
    const yerba = within(story).getByRole('group', { name: 'La yerba' })
    await user.clear(within(yerba).getByLabelText('Texto'))
    await user.type(within(yerba).getByLabelText('Texto'), '  Canarias, 1 kg.  ')
    await user.type(within(yerba).getByLabelText('Botón (opcional)'), 'Ver yerbas')

    const products = screen.getByRole('region', { name: 'Productos de la historia' })
    await user.selectOptions(within(products).getByLabelText('Bombilla 1'), 'bombillon-100-alpaca')
    const stats = screen.getByRole('region', { name: 'Cifras' })
    await user.clear(within(stats).getByLabelText('Socios'))
    await user.type(within(stats).getByLabelText('Socios'), '3')

    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Contenido guardado.')).toBeInTheDocument()

    const [, gourdScene, , yerbaScene] = expected.scenes
    if (gourdScene === undefined || yerbaScene === undefined) throw new Error('Faltan escenas.')
    gourdScene.ctaLabel = null
    yerbaScene.text = 'Canarias, 1 kg.'
    yerbaScene.ctaLabel = 'Ver yerbas'
    expected.storyProducts.bombillas = ['bombillon-100-alpaca', 'bombillon-100-alpaca']
    expected.stats.partners = 3
    expect(app.mockDb.db.content.home).toEqual(expected)
    await waitFor(() => {
      expect(screen.queryByText('Cambios sin guardar')).not.toBeInTheDocument()
    })
  })

  it('muestra el error de carga con "Reintentar"', async () => {
    const app = await createTestApp()
    app.mockDb.db.adminSession = null
    await renderWithApp(<HomeContentScreen />, { app, path: '/contenido/inicio' })

    expect(await screen.findByText('No pudimos cargar el contenido.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('si la recarga en segundo plano falla, el formulario conserva lo escrito', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    await renderHome(app)
    const hero = screen.getByRole('region', { name: 'Portada' })
    await user.clear(within(hero).getByLabelText('Línea 2'))
    await user.type(within(hero).getByLabelText('Línea 2'), 'tu yerba.')

    await failBackgroundReload(app)

    expect(screen.queryByText('No pudimos cargar el contenido.')).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Portada' })).getByLabelText('Línea 2'),
    ).toHaveValue('tu yerba.')
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument()
  })
})
