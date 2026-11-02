import type { z } from 'zod'
import { describe, expect, it } from 'vitest'
import {
  aboutContentFormSchema,
  faqContentFormSchema,
  footerContentFormSchema,
  homeContentFormSchema,
  legalContentFormSchema,
  productTabsContentFormSchema,
} from '@galpon/schemas'
import {
  ABOUT_LIMITS,
  FAQ_LIMITS,
  FOOTER_LIMITS,
  HOME_LIMITS,
  LEGAL_LIMITS,
  PRODUCT_TABS_LIMITS,
  TITLE_LINES_LIMITS,
} from './content-limits'

/** Revisa que un texto acepte justo `max` caracteres y rechace uno más (el límite del schema). */
function expectMaxLength(schema: z.ZodType, max: number): void {
  expect(schema.safeParse('a'.repeat(max)).success).toBe(true)
  expect(schema.safeParse('a'.repeat(max + 1)).success).toBe(false)
}

/** Revisa que una lista acepte justo `max` elementos válidos y rechace uno más. */
function expectMaxItems(schema: z.ZodType, max: number, item: unknown): void {
  expect(schema.safeParse(Array.from({ length: max }, () => item)).success).toBe(true)
  expect(schema.safeParse(Array.from({ length: max + 1 }, () => item)).success).toBe(false)
}

/** Una URL https de `length` caracteres. */
function urlOfLength(length: number): string {
  const base = 'https://a.ar/'
  return `${base}${'a'.repeat(length - base.length)}`
}

// Los límites de `content-limits.ts` copian los de `@galpon/schemas`, que no los exporta: estos
// tests avisan si un schema cambia y la copia queda vieja.
describe('límites de Contenido', () => {
  it('el título en líneas y el inicio copian a homeContentFormSchema', () => {
    const { hero, ritualSteps, manifesto, kitBlock } = homeContentFormSchema.shape
    const { minLines, maxLines, line } = TITLE_LINES_LIMITS
    expectMaxItems(hero.shape.titleLines, maxLines, 'Línea')
    expect(
      hero.shape.titleLines.safeParse(Array.from({ length: minLines - 1 }, () => 'Línea')).success,
    ).toBe(false)
    expectMaxLength(hero.shape.titleLines.element, line)
    expectMaxLength(hero.shape.eyebrow, HOME_LIMITS.eyebrow)
    expectMaxLength(hero.shape.text, HOME_LIMITS.text)
    expectMaxLength(hero.shape.primaryCtaLabel, HOME_LIMITS.buttonLabel)
    expectMaxLength(kitBlock.shape.title, HOME_LIMITS.title)
    expectMaxLength(manifesto.shape.text, HOME_LIMITS.manifestoText)
    expectMaxItems(ritualSteps, HOME_LIMITS.ritualSteps, 'Cebar')
    expectMaxLength(ritualSteps.element, HOME_LIMITS.ritualStep)
  })

  it('Nosotros copia a aboutContentFormSchema', () => {
    const { hero, partners, quote, steps, ctaLabel } = aboutContentFormSchema.shape
    expectMaxLength(hero.shape.eyebrow, ABOUT_LIMITS.eyebrow)
    expectMaxLength(hero.shape.text, ABOUT_LIMITS.text)
    expectMaxItems(partners, ABOUT_LIMITS.partners, { name: 'Bruno', role: 'Socio', photo: null })
    expectMaxLength(partners.element.shape.name, ABOUT_LIMITS.partnerName)
    expectMaxLength(partners.element.shape.role, ABOUT_LIMITS.partnerRole)
    const photo = (alt: number) => ({
      publicId: 'socio',
      width: 800,
      height: 1000,
      alt: 'a'.repeat(alt),
    })
    const photoSchema = partners.element.shape.photo
    expect(photoSchema.safeParse(photo(ABOUT_LIMITS.photoAltMin)).success).toBe(true)
    expect(photoSchema.safeParse(photo(ABOUT_LIMITS.photoAltMin - 1)).success).toBe(false)
    expect(photoSchema.safeParse(photo(ABOUT_LIMITS.photoAlt)).success).toBe(true)
    expect(photoSchema.safeParse(photo(ABOUT_LIMITS.photoAlt + 1)).success).toBe(false)
    expectMaxLength(quote, ABOUT_LIMITS.quote)
    expectMaxItems(steps, ABOUT_LIMITS.steps, { title: 'Elegimos', text: 'La calabaza.' })
    expectMaxLength(steps.element.shape.title, ABOUT_LIMITS.stepTitle)
    expectMaxLength(steps.element.shape.text, ABOUT_LIMITS.stepText)
    expectMaxLength(ctaLabel, ABOUT_LIMITS.buttonLabel)
  })

  it('las preguntas copian a faqContentFormSchema', () => {
    const { categories } = faqContentFormSchema.shape
    const { items, label, id } = categories.element.shape
    const question = { question: '¿Envían?', answer: 'Sí.' }
    expectMaxItems(categories, FAQ_LIMITS.categories, {
      id: 'envios',
      label: 'Envíos',
      items: [question],
    })
    expectMaxLength(label, FAQ_LIMITS.categoryLabel)
    expectMaxLength(id, FAQ_LIMITS.categoryId)
    expectMaxItems(items, FAQ_LIMITS.questions, question)
    expectMaxLength(items.element.shape.question, FAQ_LIMITS.question)
    expectMaxLength(items.element.shape.answer, FAQ_LIMITS.answer)
  })

  it('el pie, las pestañas y los legales copian a sus schemas', () => {
    const footer = footerContentFormSchema.shape
    expectMaxLength(footer.tagline, FOOTER_LIMITS.tagline)
    expectMaxLength(footer.text, FOOTER_LIMITS.text)
    expectMaxItems(footer.paymentMethods, FOOTER_LIMITS.paymentMethods, 'Mercado Pago')
    expectMaxLength(footer.paymentMethods.element, FOOTER_LIMITS.paymentMethod)
    const maxUrl = FOOTER_LIMITS.consumerDefenseUrl
    expect(footer.consumerDefenseUrl.safeParse(urlOfLength(maxUrl)).success).toBe(true)
    expect(footer.consumerDefenseUrl.safeParse(urlOfLength(maxUrl + 1)).success).toBe(false)

    const tabs = productTabsContentFormSchema.shape
    expectMaxLength(tabs.mate.shape.descriptionNote, PRODUCT_TABS_LIMITS.descriptionNote)
    expectMaxLength(tabs.mate.shape.materialsTitle, PRODUCT_TABS_LIMITS.tabTitle)
    expectMaxLength(tabs.mate.shape.care, PRODUCT_TABS_LIMITS.tabText)
    expectMaxLength(tabs.shipping, PRODUCT_TABS_LIMITS.tabText)

    const legal = legalContentFormSchema.shape
    expectMaxLength(legal.title, LEGAL_LIMITS.title)
    expectMaxLength(legal.body, LEGAL_LIMITS.body)
  })
})
