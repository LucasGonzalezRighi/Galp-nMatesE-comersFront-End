import { describe, expect, it } from 'vitest'
import {
  getAboutContent,
  getFaqContent,
  getFooterContent,
  getHomeContent,
  getLegalContent,
  getProductTabsContent,
} from '../../services'
import { createMockApi, rawRequest } from '../../test/mock-api'

describe('rutas de contenido', () => {
  it('devuelve cada contenido de la base', async () => {
    const { api, db } = createMockApi()
    expect(await getHomeContent(api)).toEqual(db.content.home)
    expect(await getAboutContent(api)).toEqual(db.content.about)
    expect(await getFaqContent(api)).toEqual(db.content.faq)
    expect(await getFooterContent(api)).toEqual(db.content.footer)
    expect(await getProductTabsContent(api)).toEqual(db.content.productTabs)
  })

  it('devuelve los documentos legales y 404 si el documento no existe', async () => {
    const mock = createMockApi()
    expect(await getLegalContent(mock.api, 'terms')).toEqual(mock.db.content.legal.terms)
    expect(await getLegalContent(mock.api, 'privacy')).toEqual(mock.db.content.legal.privacy)
    const response = await rawRequest(mock, '/content/legal/otros')
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ type: 'not_found', status: 404 })
  })
})
