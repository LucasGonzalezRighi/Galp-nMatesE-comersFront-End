import type { z } from 'zod'
import { describe, expect, it } from 'vitest'
import {
  aboutContentFormSchema,
  faqContentFormSchema,
  footerContentFormSchema,
  homeContentFormSchema,
  legalContentFormSchema,
  productTabsContentFormSchema,
} from './content'
import { issuesOf } from './test/helpers'

const SLUG = 'Solo minúsculas, números y guiones'

const SCENE_KEYS = ['pieces', 'gourd', 'bombilla', 'yerba', 'ritual', 'leather'] as const

const heading = { eyebrow: 'Destacados', title: 'Los más elegidos de la ronda' }

const validHome = {
  hero: {
    eyebrow: 'Hechos para compartir',
    titleLines: ['Encontrá', 'tu mate.'],
    text: 'Calabaza curada, virola de alpaca cincelada y bombillones de bronce.',
    primaryCtaLabel: 'Ver la tienda',
    secondaryCtaLabel: 'Armá tu kit',
  },
  scenes: SCENE_KEYS.map((key) => ({
    key,
    eyebrow: 'Mate',
    titleLines: ['Calabaza curada.', 'Virola de alpaca.'],
    text: 'Cada calabaza se elige por su forma y sus paredes.',
    ctaLabel: 'Ver mates',
  })),
  ritualSteps: ['Yerba', 'Montañita', 'Bombilla', 'Agua'],
  storyProducts: {
    hero: 'mate-imperial-premium',
    bombillas: ['bombillon-premium-curvo', 'bombillon-100-alpaca'],
    yerbas: ['yerba-canarias-1-kg', 'yerba-canarias-serena-1-kg', 'yerba-canarias-te-1-kg'],
  },
  collection: { ...heading },
  featured: { ...heading },
  reviews: { ...heading },
  manifesto: {
    eyebrow: 'Manifiesto',
    text: 'Un mate no se compra, se elige.',
    ctaLabel: 'Conocé la historia del galpón',
  },
  stats: { provinces: 24, partners: 2 },
  kitBlock: {
    eyebrow: 'Armá tu kit',
    title: 'Mate, bombilla y yerba.',
    text: 'Elegí las tres piezas en tres pasos.',
    ctaLabel: 'Armar mi kit',
  },
}

const validPhoto = {
  publicId: 'galpon/socios/bruno',
  width: 1200,
  height: 1200,
  alt: 'Bruno en el galpón',
}

const validAbout = {
  hero: {
    eyebrow: 'Sobre nosotros',
    titleLines: ['Dos socios.', 'Un galpón.', 'La ronda de siempre.'],
    text: 'Galpón nació entre dos socios que compartían la misma costumbre.',
  },
  partners: [
    { name: 'Bruno Galimberti', role: 'Socio fundador', photo: validPhoto },
    { name: 'Marcos Ruiz', role: 'Socio fundador', photo: null },
  ],
  quote: 'No vendemos lo que no usaríamos.',
  stepsEyebrow: 'Cómo trabajamos',
  steps: [
    { title: 'Elegimos cada calabaza', text: 'Buscamos formas parejas y paredes firmes.' },
    { title: 'Cosemos el cuero', text: 'Punto por punto, a mano.' },
    { title: 'Mandamos a todo el país', text: 'Embalado para que llegue entero.' },
  ],
  ctaLabel: 'Conocé la tienda',
}

const validFaq = {
  categories: [
    {
      id: 'envios',
      label: 'Envíos',
      items: [
        {
          question: '¿Hacen envíos a todo el país?',
          answer: 'Sí, enviamos a las 24 provincias.',
        },
      ],
    },
  ],
}

const validFooter = {
  tagline: 'Hechos para compartir.',
  text: 'Mates, bombillones y yerba con envío a todo el país.',
  paymentMethods: ['Mercado Pago', 'Visa'],
  consumerDefenseUrl: 'https://www.argentina.gob.ar/produccion/defensadelconsumidor',
}

const tabsGroup = {
  descriptionNote: 'Cada pieza es artesanal.',
  materialsTitle: 'Materiales',
  materials: 'Calabaza natural curable.',
  careTitle: 'Cuidado',
  care: 'Curalo antes del primer uso.',
}

const validTabs = {
  mate: tabsGroup,
  bombilla: { ...tabsGroup, descriptionNote: null },
  yerba: { ...tabsGroup, materialsTitle: 'Contenido', careTitle: 'Conservación' },
  shipping: 'Enviamos a todo el país.',
}

const validLegal = {
  title: 'Términos y condiciones',
  updatedAt: '2026-10-01',
  body: 'Primer párrafo.\n\nSegundo párrafo.',
}

/**
 * Copia de `value` con el dato de `path` reemplazado.
 *
 * @param value - Objeto de partida; no se modifica.
 * @param path - Camino hasta el dato (claves y posiciones).
 * @param replacement - Dato nuevo.
 */
function withValue<T>(value: T, path: readonly PropertyKey[], replacement: unknown): T {
  const copy = structuredClone(value)
  let target: unknown = copy
  for (const key of path.slice(0, -1)) target = (target as Record<PropertyKey, unknown>)[key]
  const last = path.at(-1)
  if (last !== undefined) (target as Record<PropertyKey, unknown>)[last] = replacement
  return copy
}

/** Cada texto con su máximo: [nombre, schema, datos válidos, camino, máximo]. */
const TEXT_LIMITS: [string, z.ZodType, unknown, (string | number)[], number][] = [
  ['inicio', homeContentFormSchema, validHome, ['hero', 'eyebrow'], 60],
  ['inicio', homeContentFormSchema, validHome, ['hero', 'titleLines', 0], 60],
  ['inicio', homeContentFormSchema, validHome, ['hero', 'text'], 600],
  ['inicio', homeContentFormSchema, validHome, ['hero', 'primaryCtaLabel'], 40],
  ['inicio', homeContentFormSchema, validHome, ['hero', 'secondaryCtaLabel'], 40],
  ['inicio', homeContentFormSchema, validHome, ['scenes', 0, 'eyebrow'], 60],
  ['inicio', homeContentFormSchema, validHome, ['scenes', 1, 'titleLines', 1], 60],
  ['inicio', homeContentFormSchema, validHome, ['scenes', 2, 'text'], 600],
  ['inicio', homeContentFormSchema, validHome, ['scenes', 3, 'ctaLabel'], 40],
  ['inicio', homeContentFormSchema, validHome, ['ritualSteps', 0], 80],
  ['inicio', homeContentFormSchema, validHome, ['collection', 'eyebrow'], 60],
  ['inicio', homeContentFormSchema, validHome, ['featured', 'title'], 60],
  ['inicio', homeContentFormSchema, validHome, ['manifesto', 'eyebrow'], 60],
  ['inicio', homeContentFormSchema, validHome, ['manifesto', 'text'], 400],
  ['inicio', homeContentFormSchema, validHome, ['manifesto', 'ctaLabel'], 40],
  ['inicio', homeContentFormSchema, validHome, ['kitBlock', 'eyebrow'], 60],
  ['inicio', homeContentFormSchema, validHome, ['kitBlock', 'title'], 60],
  ['inicio', homeContentFormSchema, validHome, ['kitBlock', 'text'], 600],
  ['inicio', homeContentFormSchema, validHome, ['kitBlock', 'ctaLabel'], 40],
  ['Nosotros', aboutContentFormSchema, validAbout, ['hero', 'eyebrow'], 60],
  ['Nosotros', aboutContentFormSchema, validAbout, ['hero', 'titleLines', 2], 60],
  ['Nosotros', aboutContentFormSchema, validAbout, ['hero', 'text'], 600],
  ['Nosotros', aboutContentFormSchema, validAbout, ['partners', 0, 'name'], 60],
  ['Nosotros', aboutContentFormSchema, validAbout, ['partners', 1, 'role'], 80],
  ['Nosotros', aboutContentFormSchema, validAbout, ['quote'], 300],
  ['Nosotros', aboutContentFormSchema, validAbout, ['stepsEyebrow'], 60],
  ['Nosotros', aboutContentFormSchema, validAbout, ['steps', 0, 'title'], 60],
  ['Nosotros', aboutContentFormSchema, validAbout, ['steps', 2, 'text'], 400],
  ['Nosotros', aboutContentFormSchema, validAbout, ['ctaLabel'], 40],
  ['preguntas', faqContentFormSchema, validFaq, ['categories', 0, 'label'], 40],
  ['preguntas', faqContentFormSchema, validFaq, ['categories', 0, 'items', 0, 'question'], 200],
  ['preguntas', faqContentFormSchema, validFaq, ['categories', 0, 'items', 0, 'answer'], 2000],
  ['pie', footerContentFormSchema, validFooter, ['tagline'], 80],
  ['pie', footerContentFormSchema, validFooter, ['text'], 300],
  ['pie', footerContentFormSchema, validFooter, ['paymentMethods', 1], 40],
  ['pestañas', productTabsContentFormSchema, validTabs, ['mate', 'descriptionNote'], 600],
  ['pestañas', productTabsContentFormSchema, validTabs, ['mate', 'materialsTitle'], 30],
  ['pestañas', productTabsContentFormSchema, validTabs, ['bombilla', 'materials'], 2000],
  ['pestañas', productTabsContentFormSchema, validTabs, ['yerba', 'careTitle'], 30],
  ['pestañas', productTabsContentFormSchema, validTabs, ['yerba', 'care'], 2000],
  ['pestañas', productTabsContentFormSchema, validTabs, ['shipping'], 2000],
  ['legal', legalContentFormSchema, validLegal, ['title'], 120],
  ['legal', legalContentFormSchema, validLegal, ['body'], 60_000],
]

/** Textos opcionales de la tabla: vacíos quedan en `null` en lugar de dar "Requerido". */
const OPTIONAL_TEXTS = new Set([
  JSON.stringify(['scenes', 3, 'ctaLabel']),
  JSON.stringify(['mate', 'descriptionNote']),
])

describe('límites de los textos', () => {
  it.each(
    TEXT_LIMITS.map(
      ([name, schema, valid, path, max]) => [name, path, max, schema, valid] as const,
    ),
  )('%s: %j admite hasta %d caracteres', (_name, path, max, schema, valid) => {
    expect(issuesOf(schema, withValue(valid, path, 'a'.repeat(max)))).toEqual([])
    expect(issuesOf(schema, withValue(valid, path, 'a'.repeat(max + 1)))).toEqual([
      { path, message: `Máximo ${String(max)} caracteres` },
    ])
  })

  it.each(
    TEXT_LIMITS.filter(([, , , path]) => !OPTIONAL_TEXTS.has(JSON.stringify(path))).map(
      ([name, schema, valid, path]) => [name, path, schema, valid] as const,
    ),
  )('%s: %j vacío da "Requerido"', (_name, path, schema, valid) => {
    expect(issuesOf(schema, withValue(valid, path, '   '))).toEqual([
      { path, message: 'Requerido' },
    ])
  })
})

describe('homeContentFormSchema', () => {
  it('acepta el contenido y recorta los textos', () => {
    const parsed = homeContentFormSchema.parse(
      withValue(validHome, ['hero', 'eyebrow'], '  Hechos para compartir  '),
    )
    expect(parsed).toEqual(validHome)
  })

  it.each([0, 4])('un título de %d líneas da el error en la lista', (count) => {
    const titleLines = Array.from({ length: count }, () => 'Línea')
    expect(
      issuesOf(homeContentFormSchema, withValue(validHome, ['hero', 'titleLines'], titleLines)),
    ).toEqual([{ path: ['hero', 'titleLines'], message: 'Cargá de 1 a 3 líneas' }])
  })

  it.each([null, '', '   '])('el botón de una escena %j queda en null', (ctaLabel) => {
    const parsed = homeContentFormSchema.parse(
      withValue(validHome, ['scenes', 0, 'ctaLabel'], ctaLabel),
    )
    expect(parsed.scenes[0]?.ctaLabel).toBeNull()
  })

  it('tienen que ser las 6 escenas', () => {
    expect(
      issuesOf(homeContentFormSchema, withValue(validHome, ['scenes'], validHome.scenes.slice(1))),
    ).toEqual([{ path: ['scenes'], message: 'Tienen que ser 6 escenas' }])
  })

  it('cada escena aparece una sola vez', () => {
    expect(
      issuesOf(homeContentFormSchema, withValue(validHome, ['scenes', 5, 'key'], 'gourd')),
    ).toEqual([{ path: ['scenes'], message: 'Cada escena tiene que aparecer una sola vez' }])
  })

  it('rechaza una escena desconocida', () => {
    expect(
      issuesOf(homeContentFormSchema, withValue(validHome, ['scenes', 0, 'key'], 'tereré')).map(
        (issue) => issue.path,
      ),
    ).toEqual([['scenes', 0, 'key']])
  })

  it('tienen que ser los 4 pasos del ritual', () => {
    expect(
      issuesOf(homeContentFormSchema, withValue(validHome, ['ritualSteps'], ['Yerba', 'Agua'])),
    ).toEqual([{ path: ['ritualSteps'], message: 'Tienen que ser 4 pasos' }])
  })

  it('los productos de la historia son slugs: 1 mate, 2 bombillas y 3 yerbas', () => {
    expect(
      issuesOf(
        homeContentFormSchema,
        withValue(validHome, ['storyProducts', 'hero'], 'Mate Imperial'),
      ),
    ).toEqual([{ path: ['storyProducts', 'hero'], message: SLUG }])
    expect(
      issuesOf(
        homeContentFormSchema,
        withValue(validHome, ['storyProducts', 'bombillas'], ['bombillon']),
      ),
    ).toEqual([{ path: ['storyProducts', 'bombillas'], message: 'Tienen que ser 2 bombillas' }])
    expect(
      issuesOf(homeContentFormSchema, withValue(validHome, ['storyProducts', 'yerbas'], ['yerba'])),
    ).toEqual([{ path: ['storyProducts', 'yerbas'], message: 'Tienen que ser 3 yerbas' }])
  })

  it.each([
    [0, true],
    [999, true],
    [-1, false],
    [1000, false],
    [2.5, false],
  ])('la cifra %d es válida: %s', (provinces, valid) => {
    const issues = issuesOf(
      homeContentFormSchema,
      withValue(validHome, ['stats', 'provinces'], provinces),
    )
    expect(issues).toEqual(
      valid
        ? []
        : [{ path: ['stats', 'provinces'], message: 'Ingresá un número entero entre 0 y 999' }],
    )
  })
})

describe('aboutContentFormSchema', () => {
  it('acepta el contenido con fotos o sin ellas', () => {
    expect(aboutContentFormSchema.parse(validAbout)).toEqual(validAbout)
  })

  it('admite hasta 8 socios, también ninguno', () => {
    const partners = Array.from({ length: 8 }, () => validAbout.partners[1])
    expect(issuesOf(aboutContentFormSchema, withValue(validAbout, ['partners'], partners))).toEqual(
      [],
    )
    expect(issuesOf(aboutContentFormSchema, withValue(validAbout, ['partners'], []))).toEqual([])
    expect(
      issuesOf(
        aboutContentFormSchema,
        withValue(validAbout, ['partners'], [...partners, partners[0]]),
      ),
    ).toEqual([{ path: ['partners'], message: 'Máximo 8 socios' }])
  })

  it('la foto de un socio sigue las reglas de las fotos', () => {
    expect(
      issuesOf(
        aboutContentFormSchema,
        withValue(validAbout, ['partners', 0, 'photo', 'alt'], 'ab'),
      ),
    ).toEqual([
      {
        path: ['partners', 0, 'photo', 'alt'],
        message: 'Escribí un texto alternativo de 3 a 120 caracteres',
      },
    ])
  })

  it.each([2, 4])('con %d pasos da el error en la lista', (count) => {
    const steps = Array.from({ length: count }, () => validAbout.steps[0])
    expect(issuesOf(aboutContentFormSchema, withValue(validAbout, ['steps'], steps))).toEqual([
      { path: ['steps'], message: 'Tienen que ser 3 pasos' },
    ])
  })
})

describe('faqContentFormSchema', () => {
  const category = validFaq.categories[0]
  const question = category?.items[0]

  it('acepta las preguntas', () => {
    expect(faqContentFormSchema.parse(validFaq)).toEqual(validFaq)
  })

  it.each([0, 11])('con %d categorías da el error en la lista', (count) => {
    const categories = Array.from({ length: count }, () => category)
    expect(issuesOf(faqContentFormSchema, { categories })).toEqual([
      { path: ['categories'], message: 'Cargá de 1 a 10 categorías' },
    ])
  })

  it('admite 10 categorías y 30 preguntas por categoría', () => {
    const items = Array.from({ length: 30 }, () => question)
    const categories = Array.from({ length: 10 }, () => ({ ...category, items }))
    expect(issuesOf(faqContentFormSchema, { categories })).toEqual([])
  })

  it.each([0, 31])('con %d preguntas da el error en la lista', (count) => {
    const items = Array.from({ length: count }, () => question)
    expect(
      issuesOf(faqContentFormSchema, withValue(validFaq, ['categories', 0, 'items'], items)),
    ).toEqual([{ path: ['categories', 0, 'items'], message: 'Cargá de 1 a 30 preguntas' }])
  })

  it('el identificador de la categoría es un slug', () => {
    expect(
      issuesOf(faqContentFormSchema, withValue(validFaq, ['categories', 0, 'id'], 'Envíos')),
    ).toEqual([{ path: ['categories', 0, 'id'], message: SLUG }])
  })
})

describe('footerContentFormSchema', () => {
  it('acepta el pie', () => {
    expect(footerContentFormSchema.parse(validFooter)).toEqual(validFooter)
  })

  it.each([null, '', '   '])('sin enlace a Defensa del Consumidor %j queda en null', (url) => {
    expect(
      footerContentFormSchema.parse({ ...validFooter, consumerDefenseUrl: url }).consumerDefenseUrl,
    ).toBeNull()
  })

  it.each(['ftp://example.com', 'www.example.com', 'no es una url'])(
    'rechaza el enlace %j',
    (url) => {
      expect(
        issuesOf(footerContentFormSchema, { ...validFooter, consumerDefenseUrl: url }),
      ).toEqual([
        { path: ['consumerDefenseUrl'], message: 'Ingresá una URL válida, con http:// o https://' },
      ])
    },
  )

  it('el enlace admite hasta 2048 caracteres', () => {
    const base = 'https://example.com/'
    const url = base + 'a'.repeat(2048 - base.length)
    expect(issuesOf(footerContentFormSchema, { ...validFooter, consumerDefenseUrl: url })).toEqual(
      [],
    )
    expect(
      issuesOf(footerContentFormSchema, { ...validFooter, consumerDefenseUrl: `${url}a` }),
    ).toEqual([{ path: ['consumerDefenseUrl'], message: 'Máximo 2048 caracteres' }])
  })

  it('admite hasta 10 medios de pago, también ninguno', () => {
    const methods = Array.from({ length: 10 }, () => 'Visa')
    expect(issuesOf(footerContentFormSchema, { ...validFooter, paymentMethods: methods })).toEqual(
      [],
    )
    expect(issuesOf(footerContentFormSchema, { ...validFooter, paymentMethods: [] })).toEqual([])
    expect(
      issuesOf(footerContentFormSchema, { ...validFooter, paymentMethods: [...methods, 'Visa'] }),
    ).toEqual([{ path: ['paymentMethods'], message: 'Máximo 10 medios de pago' }])
  })
})

describe('productTabsContentFormSchema', () => {
  it('acepta las pestañas', () => {
    expect(productTabsContentFormSchema.parse(validTabs)).toEqual(validTabs)
  })

  it.each(['', '   '])('una nota %j queda en null', (note) => {
    expect(
      productTabsContentFormSchema.parse(withValue(validTabs, ['mate', 'descriptionNote'], note))
        .mate.descriptionNote,
    ).toBeNull()
  })
})

describe('legalContentFormSchema', () => {
  it('acepta el documento', () => {
    expect(legalContentFormSchema.parse(validLegal)).toEqual(validLegal)
  })

  it.each([
    ['', 'Requerido'],
    ['2026-02-30', 'Ingresá una fecha válida (AAAA-MM-DD)'],
    ['2026-13-01', 'Ingresá una fecha válida (AAAA-MM-DD)'],
    ['01/10/2026', 'Ingresá una fecha válida (AAAA-MM-DD)'],
    ['2026-10-01T00:00:00Z', 'Ingresá una fecha válida (AAAA-MM-DD)'],
  ])('rechaza la fecha %j', (updatedAt, message) => {
    expect(issuesOf(legalContentFormSchema, { ...validLegal, updatedAt })).toEqual([
      { path: ['updatedAt'], message },
    ])
  })

  it('acepta el 29 de febrero de un año bisiesto', () => {
    expect(issuesOf(legalContentFormSchema, { ...validLegal, updatedAt: '2028-02-29' })).toEqual([])
  })
})
