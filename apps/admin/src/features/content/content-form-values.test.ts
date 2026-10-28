import { describe, expect, it } from 'vitest'
import type { AboutContent } from '@galpon/api-client'
import {
  aboutContentFormSchema,
  faqContentFormSchema,
  footerContentFormSchema,
  homeContentFormSchema,
  legalContentFormSchema,
  productTabsContentFormSchema,
} from '@galpon/schemas'
import { createTestApp } from '../../test/render'
import {
  aboutFormValues,
  aboutPhotoUrls,
  faqFormValues,
  footerFormValues,
  homeFormValues,
  legalFormValues,
  productTabsFormValues,
} from './content-form-values'

/** El contenido de demostración de la API simulada. */
async function demoContent() {
  const app = await createTestApp({ demo: false })
  return structuredClone(app.mockDb.db.content)
}

/** Nosotros con un socio con foto y otro sin. */
const ABOUT: AboutContent = {
  hero: { eyebrow: 'Sobre nosotros', titleLines: ['Dos socios.'], text: 'Un galpón.' },
  partners: [
    {
      name: 'Bruno',
      role: 'Socio',
      photo: {
        publicId: 'galpon/partners/bruno',
        url: 'https://res.cloudinary.com/galpon/bruno.jpg',
        width: 900,
        height: 1200,
        alt: 'Bruno con un mate',
      },
    },
    { name: 'Ana', role: 'Socia', photo: null },
  ],
  quote: 'No vendemos lo que no usaríamos.',
  stepsEyebrow: 'Cómo trabajamos',
  steps: [
    { title: 'Uno', text: 'Primero.' },
    { title: 'Dos', text: 'Segundo.' },
    { title: 'Tres', text: 'Tercero.' },
  ],
  ctaLabel: 'Conocé la tienda',
}

describe('content-form-values', () => {
  it('inicio: una escena sin botón queda vacía y vuelve a null con el schema', async () => {
    const { home } = await demoContent()
    const values = homeFormValues(home)

    expect(values.scenes.find((scene) => scene.key === 'pieces')?.ctaLabel).toBe('')
    expect(homeContentFormSchema.parse(values)).toEqual(home)
  })

  it('inicio: los valores no comparten listas con el contenido de la API', async () => {
    const { home } = await demoContent()
    const values = homeFormValues(home)
    values.hero.titleLines.push('otra')
    values.storyProducts.yerbas.pop()

    expect(home.hero.titleLines).toHaveLength(2)
    expect(home.storyProducts.yerbas).toHaveLength(3)
  })

  it('Nosotros: cada foto pasa de Image a ImageInput, sin url', () => {
    const values = aboutFormValues(ABOUT)

    expect(values.partners[0]?.photo).toEqual({
      publicId: 'galpon/partners/bruno',
      width: 900,
      height: 1200,
      alt: 'Bruno con un mate',
    })
    expect(values.partners[1]?.photo).toBeNull()
    expect(aboutContentFormSchema.parse(values)).toEqual({
      ...ABOUT,
      partners: [{ ...ABOUT.partners[0], photo: values.partners[0]?.photo }, ABOUT.partners[1]],
    })
  })

  it('Nosotros: guarda la url de cada foto por su publicId', () => {
    expect(aboutPhotoUrls(ABOUT)).toEqual({
      'galpon/partners/bruno': 'https://res.cloudinary.com/galpon/bruno.jpg',
    })
  })

  it('preguntas, pestañas, pie y legales hacen la ida y la vuelta con su schema', async () => {
    const { faq, productTabs, footer, legal } = await demoContent()

    expect(faqContentFormSchema.parse(faqFormValues(faq))).toEqual(faq)
    expect(productTabsFormValues(productTabs).bombilla.descriptionNote).toBe('')
    expect(productTabsContentFormSchema.parse(productTabsFormValues(productTabs))).toEqual(
      productTabs,
    )
    expect(footerFormValues(footer).consumerDefenseUrl).toBe('')
    expect(footerContentFormSchema.parse(footerFormValues(footer))).toEqual(footer)
    expect(legalContentFormSchema.parse(legalFormValues(legal.terms))).toEqual(legal.terms)
  })
})
