import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TestApp } from '../../../test/render'
import { ImageUploaderProvider } from '../../../components/media/ImageUploaderProvider'
import { createSimulatedUploader } from '../../../components/media/simulated-uploader'
import { useToastStore } from '../../../components/ui/toast'
import { Toaster } from '../../../components/ui/Toaster'
import { failBackgroundReload } from '../../../test/fail-background-reload'
import { createTestApp, renderWithApp } from '../../../test/render'
import { AboutContentScreen } from './AboutContentScreen'

async function renderAbout(app: TestApp) {
  const { registerMockImage } = app.context
  if (registerMockImage === null)
    throw new Error('La app del test tiene que estar en modo de prueba.')
  const uploader = createSimulatedUploader({ api: app.api, registerMockImage, durationMs: 0 })
  const result = await renderWithApp(
    <ImageUploaderProvider uploader={uploader} onUnauthorized={vi.fn()}>
      <AboutContentScreen />
      <Toaster />
    </ImageUploaderProvider>,
    { app, path: '/contenido/nosotros' },
  )
  await screen.findByRole('region', { name: 'Socios' })
  return result
}

/** El `input type="file"` (oculto) de la foto de un socio. */
function photoInput(partner: HTMLElement): HTMLInputElement {
  const input = partner.querySelector<HTMLInputElement>('input[type="file"]')
  if (input === null) throw new Error('Falta el campo de la foto.')
  return input
}

beforeEach(() => {
  useToastStore.setState({ toasts: [] })
})

describe('AboutContentScreen', () => {
  it('carga la portada, los socios, la frase y los pasos', async () => {
    const app = await createTestApp()
    await renderAbout(app)

    const nav = screen.getByRole('navigation', { name: 'Secciones del contenido' })
    expect(within(nav).getByRole('link', { name: 'Nosotros' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    const hero = screen.getByRole('region', { name: 'Portada' })
    expect(within(hero).getByLabelText('Línea 3')).toHaveValue('La ronda de siempre.')
    const partners = screen.getByRole('region', { name: 'Socios' })
    const bruno = within(partners).getByRole('group', { name: 'Bruno Galimberti' })
    expect(within(bruno).getByLabelText('Rol')).toHaveValue('Socio fundador')
    expect(within(bruno).getByRole('button', { name: 'Elegir archivo' })).toBeInTheDocument()
    const steps = screen.getByRole('region', { name: 'Cómo trabajamos' })
    expect(
      within(within(steps).getByRole('group', { name: 'Paso 2' })).getByLabelText('Título'),
    ).toHaveValue('Alpaca y bronce')
    const cta = screen.getByRole('region', { name: 'Botón a la tienda' })
    expect(within(cta).getByLabelText('Texto del botón')).toHaveValue('Conocé la tienda')
  })

  it('valida antes de guardar: un socio sin nombre da "Requerido"', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    const before = structuredClone(app.mockDb.db.content.about)
    await renderAbout(app)

    const partners = screen.getByRole('region', { name: 'Socios' })
    const second = within(partners).getByRole('group', { name: 'Nombre del socio' })
    await user.clear(within(second).getByLabelText('Nombre'))
    expect(second).toHaveAccessibleName('Socio 2')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await within(second).findByText('Requerido')).toBeInTheDocument()
    expect(app.mockDb.db.content.about).toEqual(before)
  })

  it('agrega un socio con foto nueva, que viaja como ImageInput, y quita otro', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    await renderAbout(app)

    const partners = screen.getByRole('region', { name: 'Socios' })
    await user.click(within(partners).getByRole('button', { name: 'Quitar a Nombre del socio' }))
    await user.click(within(partners).getByRole('button', { name: 'Agregar socio' }))
    const added = within(partners).getByRole('group', { name: 'Socio 2' })
    expect(within(added).getByLabelText('Nombre')).toHaveFocus()
    await user.type(within(added).getByLabelText('Nombre'), 'Ana Ríos')
    await user.type(within(added).getByLabelText('Rol'), 'Socia')
    const group = within(partners).getByRole('group', { name: 'Ana Ríos' })
    await user.upload(photoInput(group), new File(['foto'], 'ana.jpg', { type: 'image/jpeg' }))

    const alt = await within(group).findByLabelText('Texto alternativo')
    expect(alt).toHaveValue('Ana Ríos')
    expect(within(group).getByRole('img', { name: 'Ana Ríos' })).toHaveAttribute(
      'src',
      expect.stringMatching(/^data:image\//),
    )
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(await screen.findByText('Contenido guardado.')).toBeInTheDocument()

    const saved = app.mockDb.db.content.about.partners
    expect(saved.map((partner) => partner.name)).toEqual(['Bruno Galimberti', 'Ana Ríos'])
    const photo = saved[1]?.photo
    expect(photo).toMatchObject({ width: 1000, height: 1000, alt: 'Ana Ríos' })
    expect(photo?.publicId).toMatch(/\/mock-/)
    expect(photo?.url).toMatch(/^data:image\//)
  })

  it('no guarda mientras una foto falló y muestra el 422 de una foto que el back no conoce', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    await renderAbout(app)

    const partners = screen.getByRole('region', { name: 'Socios' })
    const bruno = within(partners).getByRole('group', { name: 'Bruno Galimberti' })
    await user.upload(
      photoInput(bruno),
      new File(['foto'], 'error-bruno.jpg', { type: 'image/jpeg' }),
    )
    expect(await within(bruno).findByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(
      await screen.findByText('Hay fotos que no se subieron: reintentá o quitalas.'),
    ).toBeInTheDocument()

    await user.click(within(bruno).getByRole('button', { name: 'Reintentar' }))
    await within(bruno).findByLabelText('Texto alternativo')
    for (const publicId of Object.keys(app.mockDb.db.media)) {
      Reflect.deleteProperty(app.mockDb.db.media, publicId)
    }
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await within(bruno).findByText('La foto no existe: subila de nuevo')).toBeInTheDocument()
    await waitFor(() => {
      expect(app.mockDb.db.content.about.partners[0]?.photo).toBeNull()
    })
  })

  it('si la recarga en segundo plano falla, el formulario conserva lo escrito', async () => {
    const user = userEvent.setup()
    const app = await createTestApp()
    await renderAbout(app)
    const hero = screen.getByRole('region', { name: 'Portada' })
    await user.clear(within(hero).getByLabelText('Línea 3'))
    await user.type(within(hero).getByLabelText('Línea 3'), 'Otra ronda.')

    await failBackgroundReload(app)

    expect(screen.queryByText('No pudimos cargar el contenido.')).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Portada' })).getByLabelText('Línea 3'),
    ).toHaveValue('Otra ronda.')
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument()
  })
})
