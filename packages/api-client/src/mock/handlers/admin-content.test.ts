import { describe, expect, it } from 'vitest'
import type { AboutContentInput, AdminSettings } from '../../generated/schema'
import { isApiError } from '../../errors'
import {
  getAboutContent,
  getAdminAboutContent,
  getAdminFaqContent,
  getAdminFooterContent,
  getAdminHomeContent,
  getAdminLegalContent,
  getAdminProductTabsContent,
  getAdminSettings,
  getLegalContent,
  getPublicSettings,
  updateAdminAboutContent,
  updateAdminFaqContent,
  updateAdminFooterContent,
  updateAdminHomeContent,
  updateAdminLegalContent,
  updateAdminProductTabsContent,
  updateAdminSettings,
} from '../../services'
import { createMockApi, rawRequest } from '../../test/mock-api'
import { FIXTURE_CONTENT } from '../fixtures/content'
import { MATE_IMPERIAL_PREMIUM_IMAGE } from '../fixtures/products'
import { FIXTURE_SETTINGS } from '../fixtures/settings'
import { createAdminDemoApi } from '../test/admin-demo-api'

/** Nosotros como lo manda el dashboard: las fotos de los socios como `ImageInput`. */
function aboutInput(): AboutContentInput {
  const about = structuredClone(FIXTURE_CONTENT.about)
  return {
    ...about,
    partners: about.partners.map((partner) => ({ ...partner, photo: null })),
  }
}

/** Campos con error de un `ApiError` de validación. */
async function failedFields(promise: Promise<unknown>): Promise<string[]> {
  try {
    await promise
  } catch (error) {
    if (isApiError(error) && error.kind === 'validation') {
      return Object.keys(error.fieldErrors)
    }
    throw error
  }
  throw new Error('No falló')
}

describe('contenido del admin', () => {
  it('sin sesión responde 401 y sin token CSRF, 403', async () => {
    await expect(getAdminHomeContent(createMockApi().api)).rejects.toMatchObject({ status: 401 })
    const mock = await createAdminDemoApi()
    mock.setCsrfToken(undefined)
    await expect(updateAdminFooterContent(mock.api, FIXTURE_CONTENT.footer)).rejects.toMatchObject({
      status: 403,
    })
  })

  it('devuelve cada página tal como está guardada', async () => {
    const mock = await createAdminDemoApi()
    await expect(getAdminHomeContent(mock.api)).resolves.toEqual(FIXTURE_CONTENT.home)
    await expect(getAdminAboutContent(mock.api)).resolves.toEqual(FIXTURE_CONTENT.about)
    await expect(getAdminFaqContent(mock.api)).resolves.toEqual(FIXTURE_CONTENT.faq)
    await expect(getAdminFooterContent(mock.api)).resolves.toEqual(FIXTURE_CONTENT.footer)
    await expect(getAdminProductTabsContent(mock.api)).resolves.toEqual(FIXTURE_CONTENT.productTabs)
    await expect(getAdminLegalContent(mock.api, 'privacy')).resolves.toEqual(
      FIXTURE_CONTENT.legal.privacy,
    )
  })

  it('cada PUT guarda lo normalizado e invalida su etiqueta', async () => {
    const mock = await createAdminDemoApi()
    const home = structuredClone(FIXTURE_CONTENT.home)
    home.hero.eyebrow = '  Hechos a mano  '
    await expect(updateAdminHomeContent(mock.api, home)).resolves.toMatchObject({
      hero: { eyebrow: 'Hechos a mano' },
    })
    expect(mock.db.content.home.hero.eyebrow).toBe('Hechos a mano')

    await updateAdminAboutContent(mock.api, aboutInput())
    await updateAdminFaqContent(mock.api, FIXTURE_CONTENT.faq)
    const footer = await updateAdminFooterContent(mock.api, {
      ...FIXTURE_CONTENT.footer,
      consumerDefenseUrl: '',
    })
    expect(footer.consumerDefenseUrl).toBeNull()
    await updateAdminProductTabsContent(mock.api, FIXTURE_CONTENT.productTabs)
    await updateAdminLegalContent(mock.api, 'terms', {
      ...FIXTURE_CONTENT.legal.terms,
      title: 'Términos nuevos',
    })
    await expect(getLegalContent(mock.api, 'terms')).resolves.toMatchObject({
      title: 'Términos nuevos',
    })
    expect(mock.invalidated).toEqual([
      ['content:home'],
      ['content:about'],
      ['content:faq'],
      ['content:footer'],
      ['content:product-tabs'],
      ['content:legal-terms'],
    ])
  })

  it('un contenido inválido responde 422 con un error por campo y no guarda', async () => {
    const mock = await createAdminDemoApi()
    const home = structuredClone(FIXTURE_CONTENT.home)
    home.hero.eyebrow = ''
    home.ritualSteps = home.ritualSteps.slice(1)
    await expect(failedFields(updateAdminHomeContent(mock.api, home))).resolves.toEqual([
      'hero.eyebrow',
      'ritualSteps',
    ])
    expect(mock.db.content.home).toEqual(FIXTURE_CONTENT.home)

    const faq = structuredClone(FIXTURE_CONTENT.faq)
    const [category] = faq.categories
    if (category === undefined) throw new Error('Falta una categoría')
    category.items = []
    await expect(failedFields(updateAdminFaqContent(mock.api, faq))).resolves.toEqual([
      'categories.0.items',
    ])
    expect(mock.invalidated).toEqual([])
  })

  it('Nosotros resuelve la foto de cada socio y rechaza una que no existe', async () => {
    const mock = await createAdminDemoApi()
    const input = aboutInput()
    const [partner] = input.partners
    if (partner === undefined) throw new Error('Falta un socio')
    partner.photo = {
      publicId: MATE_IMPERIAL_PREMIUM_IMAGE.publicId,
      width: 800,
      height: 1000,
      alt: 'Bruno en el taller',
    }
    const saved = await updateAdminAboutContent(mock.api, input)
    expect(saved.partners[0]?.photo).toEqual({
      publicId: MATE_IMPERIAL_PREMIUM_IMAGE.publicId,
      url: MATE_IMPERIAL_PREMIUM_IMAGE.url,
      width: 800,
      height: 1000,
      alt: 'Bruno en el taller',
    })
    await expect(getAboutContent(mock.api)).resolves.toEqual(saved)

    partner.photo = { ...partner.photo, publicId: 'galpon/socios/no-existe' }
    await expect(failedFields(updateAdminAboutContent(mock.api, input))).resolves.toEqual([
      'partners.0.photo.publicId',
    ])
  })

  it('un documento legal que no es terms ni privacy responde 404', async () => {
    const mock = await createAdminDemoApi()
    for (const method of ['GET', 'PUT'] as const) {
      const response = await rawRequest(mock, '/admin/content/legal/cookies', {
        method,
        headers: { 'X-CSRF-Token': mock.db.adminSession?.csrfToken ?? '' },
        ...(method === 'PUT' ? { body: JSON.stringify(FIXTURE_CONTENT.legal.terms) } : {}),
      })
      expect(response.status).toBe(404)
    }
    expect(() => getAdminLegalContent(mock.api, 'cookies' as never)).toThrow(RangeError)
    expect(() =>
      updateAdminLegalContent(mock.api, 'cookies' as never, FIXTURE_CONTENT.legal.terms),
    ).toThrow(RangeError)
  })
})

describe('ajustes del admin', () => {
  it('devuelve los ajustes completos, con el IVA y el umbral', async () => {
    const mock = await createAdminDemoApi()
    await expect(getAdminSettings(mock.api)).resolves.toEqual(FIXTURE_SETTINGS)
  })

  it('guarda los ajustes, conserva el nombre de cada envío e invalida settings', async () => {
    const mock = await createAdminDemoApi()
    const input: AdminSettings = structuredClone(FIXTURE_SETTINGS)
    input.kitDiscountPercent = 15
    input.shippingOptions = input.shippingOptions
      .map((option) => ({ ...option, label: 'Otro nombre', costArs: option.costArs + 100 }))
      .reverse()
    input.seller.cuit = '20-12345678-6'
    const saved = await updateAdminSettings(mock.api, input)
    expect(saved.kitDiscountPercent).toBe(15)
    expect(saved.seller.cuit).toBe('20123456786')
    expect(saved.shippingOptions).toEqual(
      FIXTURE_SETTINGS.shippingOptions.map((option) => ({
        ...option,
        costArs: option.costArs + 100,
      })),
    )
    await expect(getPublicSettings(mock.api)).resolves.toMatchObject({ kitDiscountPercent: 15 })
    expect(mock.invalidated).toEqual([['settings']])
  })

  it('sin los tres envíos responde 422 en shippingOptions', async () => {
    const mock = await createAdminDemoApi()
    const input: AdminSettings = structuredClone(FIXTURE_SETTINGS)
    input.shippingOptions = input.shippingOptions.slice(0, 2)
    await expect(failedFields(updateAdminSettings(mock.api, input))).resolves.toEqual([
      'shippingOptions',
    ])
    expect(mock.db.settings).toEqual(FIXTURE_SETTINGS)
  })
})
