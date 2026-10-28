import { describe, expect, it } from 'vitest'
import type { Category } from '@galpon/api-client'
import { categoryFormValues } from './category-form-values'

/** Una línea con foto, como la devuelve la API. */
const CATEGORY: Category = {
  id: 'cat-imperiales',
  slug: 'imperiales',
  name: 'Imperiales',
  group: 'mate',
  blurb: 'El mate de ceremonia.',
  position: 1,
  productCount: 4,
  image: {
    publicId: 'galpon/lineas/imperiales',
    url: 'https://res.cloudinary.com/galpon/imperiales.jpg',
    width: 960,
    height: 1280,
    alt: 'Mate imperial',
  },
}

describe('categoryFormValues', () => {
  it('arranca una línea nueva vacía, en el grupo de los mates y sin foto', () => {
    expect(categoryFormValues(null)).toEqual({
      name: '',
      slug: '',
      group: 'mate',
      blurb: '',
      image: null,
    })
  })

  it('carga una línea con la foto sin su dirección (la API la arma desde publicId)', () => {
    expect(categoryFormValues(CATEGORY)).toEqual({
      name: 'Imperiales',
      slug: 'imperiales',
      group: 'mate',
      blurb: 'El mate de ceremonia.',
      image: {
        publicId: 'galpon/lineas/imperiales',
        width: 960,
        height: 1280,
        alt: 'Mate imperial',
      },
    })
    expect(categoryFormValues({ ...CATEGORY, image: null }).image).toBeNull()
  })
})
