import type {
  AboutContent,
  FaqContent,
  FooterContent,
  HomeContent,
  LegalContent,
  ProductTabsContent,
} from '@galpon/api-client'
import type {
  AboutContentFormInput,
  FaqContentFormInput,
  FooterContentFormInput,
  HomeContentFormInput,
  LegalContentFormInput,
  ProductTabsContentFormInput,
} from '@galpon/schemas'

// La vuelta (valores del formulario → cuerpo del `PUT`) es la salida de cada `*ContentFormSchema`
// de `@galpon/schemas`: recorta los textos, pasa los opcionales vacíos a `null` y deja las fotos
// de los socios como `ImageInput`. Acá va solo la ida, de la API al formulario.

/**
 * Valores iniciales del formulario del inicio: el botón de una escena sin botón queda vacío.
 *
 * @param content - Inicio como lo devuelve la API.
 * @returns Los valores del formulario.
 */
export function homeFormValues(content: HomeContent): HomeContentFormInput {
  return {
    ...content,
    hero: { ...content.hero, titleLines: [...content.hero.titleLines] },
    scenes: content.scenes.map((scene) => ({
      ...scene,
      titleLines: [...scene.titleLines],
      ctaLabel: scene.ctaLabel ?? '',
    })),
    ritualSteps: [...content.ritualSteps],
    storyProducts: {
      hero: content.storyProducts.hero,
      bombillas: [...content.storyProducts.bombillas],
      yerbas: [...content.storyProducts.yerbas],
    },
  }
}

/**
 * Valores iniciales del formulario de Nosotros: cada foto de socio pasa de `Image` a
 * `ImageInput` (sin `url`, que el back arma desde `publicId`). Para mostrarlas, ver
 * {@link aboutPhotoUrls}.
 *
 * @param content - Nosotros como lo devuelve la API.
 * @returns Los valores del formulario.
 */
export function aboutFormValues(content: AboutContent): AboutContentFormInput {
  return {
    ...content,
    hero: { ...content.hero, titleLines: [...content.hero.titleLines] },
    partners: content.partners.map(({ name, role, photo }) => ({
      name,
      role,
      photo:
        photo === null
          ? null
          : { publicId: photo.publicId, width: photo.width, height: photo.height, alt: photo.alt },
    })),
    steps: content.steps.map((step) => ({ ...step })),
  }
}

/**
 * Dirección de cada foto de socio, por su `publicId`, para mostrarla en el formulario.
 *
 * @param content - Nosotros como lo devuelve la API.
 * @returns `publicId` → `url`.
 */
export function aboutPhotoUrls(content: AboutContent): Record<string, string> {
  const urls: Record<string, string> = {}
  for (const { photo } of content.partners) {
    if (photo !== null) urls[photo.publicId] = photo.url
  }
  return urls
}

/**
 * Valores iniciales del formulario de preguntas frecuentes.
 *
 * @param content - Preguntas como las devuelve la API.
 * @returns Los valores del formulario.
 */
export function faqFormValues(content: FaqContent): FaqContentFormInput {
  return {
    categories: content.categories.map(({ id, label, items }) => ({
      id,
      label,
      items: items.map(({ question, answer }) => ({ question, answer })),
    })),
  }
}

/**
 * Valores iniciales del formulario del pie: sin enlace a Defensa del Consumidor, el campo vacío.
 *
 * @param content - Pie como lo devuelve la API.
 * @returns Los valores del formulario.
 */
export function footerFormValues(content: FooterContent): FooterContentFormInput {
  return {
    ...content,
    paymentMethods: [...content.paymentMethods],
    consumerDefenseUrl: content.consumerDefenseUrl ?? '',
  }
}

/**
 * Valores iniciales del formulario de las pestañas: un grupo sin nota, el campo vacío.
 *
 * @param content - Pestañas como las devuelve la API.
 * @returns Los valores del formulario.
 */
export function productTabsFormValues(content: ProductTabsContent): ProductTabsContentFormInput {
  return {
    mate: { ...content.mate, descriptionNote: content.mate.descriptionNote ?? '' },
    bombilla: { ...content.bombilla, descriptionNote: content.bombilla.descriptionNote ?? '' },
    yerba: { ...content.yerba, descriptionNote: content.yerba.descriptionNote ?? '' },
    shipping: content.shipping,
  }
}

/**
 * Valores iniciales del formulario de un documento legal.
 *
 * @param content - Documento como lo devuelve la API.
 * @returns Los valores del formulario.
 */
export function legalFormValues(content: LegalContent): LegalContentFormInput {
  return { title: content.title, updatedAt: content.updatedAt, body: content.body }
}
