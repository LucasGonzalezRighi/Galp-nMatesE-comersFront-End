import { describe, expect, it } from 'vitest'
import { DEFAULT_CONSUMER_LINKS } from '@galpon/domain'
import { getPublicSettings } from '../../services'
import { createMockApi } from '../../test/mock-api'

describe('GET /settings/public', () => {
  it('devuelve los ajustes públicos sin la alícuota ni el umbral de stock', async () => {
    const { api, db } = createMockApi()
    const settings = await getPublicSettings(api)
    expect(settings).not.toHaveProperty('vatRatePercent')
    expect(settings).not.toHaveProperty('lowStockThreshold')
    expect(settings).toEqual({
      kitDiscountPercent: db.settings.kitDiscountPercent,
      shippingOptions: db.settings.shippingOptions,
      installments: db.settings.installments,
      contactEmail: db.settings.contactEmail,
      priceDisplay: db.settings.priceDisplay,
      seller: db.settings.seller,
      consumerLinks: db.settings.consumerLinks,
    })
  })

  it('trae los enlaces de fábrica a Defensa del Consumidor', async () => {
    const { api } = createMockApi()
    await expect(getPublicSettings(api)).resolves.toMatchObject({
      consumerLinks: DEFAULT_CONSUMER_LINKS,
    })
  })
})
