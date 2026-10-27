// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { closeSearch, openSearch } from '@/components/layout/search-trigger'
import type { SearchTestApi } from './test/support'
import { SearchModal } from './SearchModal'
import { createSearchTestApi, offlineFetch } from './test/support'

/** Navegación simulada: guarda las rutas a las que se pidió ir. */
const router = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: (): { push: (href: string) => void } => router,
}))

/** Lo que devuelve {@link renderSearch}: la API simulada y el usuario que teclea. */
interface Rendered {
  /** API simulada del test. */
  api: SearchTestApi
  /** Usuario que teclea y hace clic. */
  user: ReturnType<typeof userEvent.setup>
}

/** Dibuja el buscador junto con un campo de texto de la página, para probar el atajo "/". */
function renderSearch(fetchOverride?: Parameters<typeof createSearchTestApi>[0]): Rendered {
  const api = createSearchTestApi(fetchOverride)
  const page: ReactNode = (
    <>
      <input aria-label="Campo de la página" />
      <SearchModal />
    </>
  )
  render(api.wrap(page))
  return { api, user: userEvent.setup() }
}

/** El campo de búsqueda del modal. */
function searchbox(): Promise<HTMLElement> {
  return screen.findByRole('searchbox', { name: 'Buscar' })
}

/** Cantidad de pedidos de productos (el catálogo) que hizo el buscador. */
function catalogRequests(requests: readonly Request[]): number {
  return requests.filter((request) => new URL(request.url).pathname.endsWith('/products')).length
}

/** Espera a que el modal se cierre. */
async function expectClosed(): Promise<void> {
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
}

beforeEach(() => {
  router.push.mockClear()
})

afterEach(() => {
  closeSearch()
  cleanup()
})

describe('SearchModal: abrir y cerrar', () => {
  it('empieza cerrado y no pide el catálogo hasta abrirse', () => {
    const { api } = renderSearch()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(catalogRequests(api.requests)).toBe(0)
  })

  it('"/" fuera de los campos lo abre y deja el foco en el campo, sin escribir la barra', async () => {
    const { user } = renderSearch()

    await user.keyboard('/')

    const field = await searchbox()
    expect(screen.getByRole('dialog', { name: 'Buscar' })).toBeInTheDocument()
    await waitFor(() => {
      expect(field).toHaveFocus()
    })
    expect(field).toHaveValue('')
  })

  it('"/" dentro de un campo de texto es un carácter más y no lo abre', async () => {
    const { user } = renderSearch()

    await user.click(screen.getByLabelText('Campo de la página'))
    await user.keyboard('a/b')

    expect(screen.getByLabelText('Campo de la página')).toHaveValue('a/b')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('"/" con Ctrl o Cmd no lo abre', async () => {
    const { user } = renderSearch()

    await user.keyboard('{Control>}/{/Control}')
    await user.keyboard('{Meta>}/{/Meta}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('la lupa del encabezado (openSearch) lo abre y Escape lo cierra', async () => {
    const { user } = renderSearch()

    openSearch()
    await searchbox()
    await user.keyboard('{Escape}')

    await expectClosed()
  })

  it('el botón Cerrar búsqueda lo cierra', async () => {
    const { user } = renderSearch()
    openSearch()
    await searchbox()

    await user.click(screen.getByRole('button', { name: 'Cerrar búsqueda' }))

    await expectClosed()
  })

  it('al cerrarlo se limpia lo escrito: al reabrir el campo está vacío', async () => {
    const { user } = renderSearch()
    openSearch()
    await user.type(await searchbox(), 'imperial')
    await user.keyboard('{Escape}')
    await expectClosed()

    openSearch()
    expect(await searchbox()).toHaveValue('')
  })
})

describe('SearchModal: contenido', () => {
  it('con el campo vacío muestra las líneas de la tienda', async () => {
    renderSearch()
    openSearch()

    const lines = await screen.findByRole('group', { name: 'Líneas' })

    await waitFor(() => {
      expect(within(lines).getAllByRole('link').length).toBeGreaterThan(0)
    })
    for (const link of within(lines).getAllByRole('link')) {
      expect(link.getAttribute('href')).toMatch(/^\/tienda\/[a-z0-9-]+$/)
    }
  })

  it('el catálogo se pide al abrir por primera vez y no de nuevo al reabrir', async () => {
    const { api, user } = renderSearch()
    openSearch()
    await searchbox()
    await waitFor(() => {
      expect(catalogRequests(api.requests)).toBeGreaterThan(0)
    })
    const first = catalogRequests(api.requests)

    await user.keyboard('{Escape}')
    await expectClosed()
    openSearch()
    await searchbox()

    expect(catalogRequests(api.requests)).toBe(first)
  })

  it('al escribir muestra los productos que coinciden, sin importar acentos ni mayúsculas', async () => {
    const { user } = renderSearch()
    openSearch()

    await user.type(await searchbox(), 'BOMBILLON CURVO')

    const results = await screen.findByRole('list', { name: 'Resultados' })
    expect(within(results).getByText('Bombillón Curvo')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Ver todos los resultados en la tienda' }),
    ).toHaveAttribute('href', '/tienda?q=BOMBILLON%20CURVO')
  })

  it('muestra hasta 6 resultados aunque haya más', async () => {
    const { user } = renderSearch()
    openSearch()

    await user.type(await searchbox(), 'mate')

    const results = await screen.findByRole('list', { name: 'Resultados' })
    expect(within(results).getAllByRole('listitem')).toHaveLength(6)
  })

  it('sin coincidencias dice "Sin resultados para “…”." con el texto escrito', async () => {
    const { user } = renderSearch()
    openSearch()

    await user.type(await searchbox(), 'termo')

    expect(await screen.findByText('Sin resultados para “termo”.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Resultados' })).not.toBeInTheDocument()
  })

  it('un texto con HTML se muestra como texto', async () => {
    const { user } = renderSearch()
    openSearch()

    await user.type(await searchbox(), '<b>x</b>')

    expect(await screen.findByText('Sin resultados para “<b>x</b>”.')).toBeInTheDocument()
    expect(document.querySelector('b')).toBeNull()
  })

  it('si el catálogo no carga avisa y deja reintentar', async () => {
    renderSearch(offlineFetch)
    openSearch()

    expect(await screen.findByText('No pudimos buscar, probá de nuevo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled()
  })
})

describe('SearchModal: Enter (Review Focus 5)', () => {
  it('con un solo resultado abre la ficha del producto y cierra el buscador', async () => {
    const { user } = renderSearch()
    openSearch()

    await user.type(await searchbox(), 'coquito')
    const results = await screen.findByRole('list', { name: 'Resultados' })
    expect(within(results).getAllByRole('listitem')).toHaveLength(1)
    await user.keyboard('{Enter}')

    expect(router.push).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith('/producto/mate-coquito-criollo')
    await expectClosed()
  })

  it('con varios resultados va a /tienda?q= con el texto codificado', async () => {
    const { user } = renderSearch()
    openSearch()

    await user.type(await searchbox(), 'mate torpedo')
    await screen.findByRole('list', { name: 'Resultados' })
    await user.keyboard('{Enter}')

    expect(router.push).toHaveBeenCalledWith('/tienda?q=mate%20torpedo')
  })

  it('con ningún resultado va a /tienda?q=', async () => {
    const { user } = renderSearch()
    openSearch()

    await user.type(await searchbox(), 'termo')
    await screen.findByText('Sin resultados para “termo”.')
    await user.keyboard('{Enter}')

    expect(router.push).toHaveBeenCalledWith('/tienda?q=termo')
  })

  it('con un script o un emoji la dirección va codificada', async () => {
    const { user } = renderSearch()
    openSearch()

    await user.type(await searchbox(), '<script>')
    await screen.findByText('Sin resultados para “<script>”.')
    await user.keyboard('{Enter}')
    expect(router.push).toHaveBeenLastCalledWith('/tienda?q=%3Cscript%3E')
    await expectClosed()

    openSearch()
    const again = await searchbox()
    await user.clear(again)
    await user.type(again, '\u{1F9C9}')
    await screen.findByText('Sin resultados para “\u{1F9C9}”.')
    await user.keyboard('{Enter}')
    expect(router.push).toHaveBeenLastCalledWith('/tienda?q=%F0%9F%A7%89')
  })

  it('con el campo vacío Enter va a /tienda', async () => {
    const { user } = renderSearch()
    openSearch()
    await searchbox()

    await user.keyboard('{Enter}')

    expect(router.push).toHaveBeenCalledWith('/tienda')
  })
})
