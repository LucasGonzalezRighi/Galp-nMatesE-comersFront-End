import type { z } from 'zod'
import { DEFAULT_SHIPPING_OPTIONS, SHIPPING_METHODS } from '@galpon/domain'
import {
  aboutContentFormSchema,
  faqContentFormSchema,
  footerContentFormSchema,
  homeContentFormSchema,
  legalContentFormSchema,
  productTabsContentFormSchema,
  settingsFormSchema,
} from '@galpon/schemas'
import type { AboutContent, AdminSettings, Image } from '../../generated/schema'
import type { MockContext, MockRoute } from '../router'
import type { MockContent, MockDb } from '../types'
import { json, notFound, ResponseError } from '../http'
import { resolveImage } from '../mappers'
import { route } from '../router'
import { parseOrFail } from '../validation'
import { requireAdmin } from './admin-auth'

/** Páginas de contenido que se guardan enteras con el mismo schema que el formulario. */
type PlainPage = 'home' | 'faq' | 'footer' | 'productTabs'

/** Ruta, etiqueta de caché y schema de cada página de contenido sin fotos. */
interface PlainPageRoute<K extends PlainPage> {
  /** Clave en `db.content`. */
  key: K
  /** Ruta del contrato. */
  path:
    | '/admin/content/home'
    | '/admin/content/faq'
    | '/admin/content/footer'
    | '/admin/content/product-tabs'
  /** Etiqueta de caché que se invalida al guardar. */
  tag: string
  /** Reglas del formulario; su salida es la página como la guarda la base. */
  schema: z.ZodType<MockContent[K]>
}

/** Documentos legales del contrato. */
const LEGAL_DOCUMENTS = ['terms', 'privacy'] as const

/** Documento legal de la ruta (`{document}`). */
function legalDocument(ctx: MockContext): (typeof LEGAL_DOCUMENTS)[number] {
  const document = LEGAL_DOCUMENTS.find((candidate) => candidate === ctx.params.document)
  if (document === undefined) {
    throw new ResponseError(notFound('No existe ese documento legal.'))
  }
  return document
}

/** Arma el `GET` y el `PUT` de una página de contenido sin fotos. */
function plainPageRoutes<K extends PlainPage>(page: PlainPageRoute<K>): MockRoute[] {
  return [
    route('GET', page.path, (ctx) => {
      requireAdmin(ctx, { csrf: false })
      return json(ctx.db.content[page.key])
    }),
    route('PUT', page.path, async (ctx) => {
      requireAdmin(ctx, { csrf: true })
      const content = parseOrFail(page.schema, await ctx.body())
      ctx.db.content[page.key] = content
      ctx.invalidate([page.tag])
      return json(content)
    }),
  ]
}

/**
 * Arma Nosotros con la foto de cada socio resuelta (`ImageInput` → `Image`).
 *
 * @throws {ResponseError} Con `422` en `partners.N.photo.publicId` si una foto no existe.
 */
function aboutContent(input: z.output<typeof aboutContentFormSchema>, db: MockDb): AboutContent {
  const current: Image[] = db.content.about.partners.flatMap((partner) =>
    partner.photo === null ? [] : [partner.photo],
  )
  return {
    ...input,
    partners: input.partners.map((partner, index) => ({
      ...partner,
      photo:
        partner.photo === null
          ? null
          : resolveImage(partner.photo, db, current, `partners.${String(index)}.photo`),
    })),
  }
}

/**
 * Arma los ajustes a guardar: las opciones de envío salen en el orden de `SHIPPING_METHODS` y
 * conservan su nombre (`label`), que el dashboard no edita.
 */
function adminSettings(input: z.output<typeof settingsFormSchema>, db: MockDb): AdminSettings {
  const labelOf = (method: (typeof SHIPPING_METHODS)[number]) =>
    db.settings.shippingOptions.find((option) => option.method === method)?.label ??
    DEFAULT_SHIPPING_OPTIONS.find((option) => option.method === method)?.label ??
    method
  return {
    ...input,
    shippingOptions: SHIPPING_METHODS.flatMap((method) => {
      const option = input.shippingOptions.find((candidate) => candidate.method === method)
      return option === undefined ? [] : [{ ...option, label: labelOf(method) }]
    }),
  }
}

/**
 * Rutas del dashboard para el contenido del sitio y los ajustes.
 *
 * Cada `GET` devuelve lo guardado y cada `PUT` reemplaza la página entera: valida con el schema del
 * formulario (`422` por campo), guarda lo normalizado e invalida su etiqueta de caché
 * (`content:home`, `content:about`, `content:faq`, `content:footer`, `content:product-tabs`,
 * `content:legal-{documento}` y `settings`). Nosotros resuelve las fotos de los socios con
 * `resolveImage`; un documento legal que no es `terms` ni `privacy` responde `404`.
 */
export const adminContentRoutes: readonly MockRoute[] = [
  ...plainPageRoutes({
    key: 'home',
    path: '/admin/content/home',
    tag: 'content:home',
    schema: homeContentFormSchema,
  }),

  route('GET', '/admin/content/about', (ctx) => {
    requireAdmin(ctx, { csrf: false })
    return json(ctx.db.content.about)
  }),
  route('PUT', '/admin/content/about', async (ctx) => {
    requireAdmin(ctx, { csrf: true })
    const input = parseOrFail(aboutContentFormSchema, await ctx.body())
    const about = aboutContent(input, ctx.db)
    ctx.db.content.about = about
    ctx.invalidate(['content:about'])
    return json(about)
  }),

  ...plainPageRoutes({
    key: 'faq',
    path: '/admin/content/faq',
    tag: 'content:faq',
    schema: faqContentFormSchema,
  }),
  ...plainPageRoutes({
    key: 'footer',
    path: '/admin/content/footer',
    tag: 'content:footer',
    schema: footerContentFormSchema,
  }),
  ...plainPageRoutes({
    key: 'productTabs',
    path: '/admin/content/product-tabs',
    tag: 'content:product-tabs',
    schema: productTabsContentFormSchema,
  }),

  route('GET', '/admin/content/legal/{document}', (ctx) => {
    requireAdmin(ctx, { csrf: false })
    return json(ctx.db.content.legal[legalDocument(ctx)])
  }),
  route('PUT', '/admin/content/legal/{document}', async (ctx) => {
    requireAdmin(ctx, { csrf: true })
    const document = legalDocument(ctx)
    const legal = parseOrFail(legalContentFormSchema, await ctx.body())
    ctx.db.content.legal[document] = legal
    ctx.invalidate([`content:legal-${document}`])
    return json(legal)
  }),

  route('GET', '/admin/settings', (ctx) => {
    requireAdmin(ctx, { csrf: false })
    return json(ctx.db.settings)
  }),
  route('PUT', '/admin/settings', async (ctx) => {
    requireAdmin(ctx, { csrf: true })
    const input = parseOrFail(settingsFormSchema, await ctx.body())
    const settings = adminSettings(input, ctx.db)
    ctx.db.settings = settings
    ctx.invalidate(['settings'])
    return json(settings)
  }),
]
