import { createMemoryHistory, createRouter } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'
import { routeTree } from '../../routeTree.gen'
import { createTestApp } from '../../test/render'

describe('/contenido', () => {
  it('redirige a /contenido/inicio', async () => {
    const app = await createTestApp()
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/contenido'] }),
      context: app.context,
    })

    await router.load()

    expect(router.state.location.pathname).toBe('/contenido/inicio')
  })
})
