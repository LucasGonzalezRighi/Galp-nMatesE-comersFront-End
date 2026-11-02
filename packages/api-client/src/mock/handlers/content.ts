import type { MockRoute } from '../router'
import { json, notFound } from '../http'
import { route } from '../router'

/** Rutas públicas de contenido: un texto editable por página y los documentos legales. */
export const contentRoutes: readonly MockRoute[] = [
  route('GET', '/content/home', ({ db }) => json(db.content.home)),
  route('GET', '/content/about', ({ db }) => json(db.content.about)),
  route('GET', '/content/faq', ({ db }) => json(db.content.faq)),
  route('GET', '/content/footer', ({ db }) => json(db.content.footer)),
  route('GET', '/content/product-tabs', ({ db }) => json(db.content.productTabs)),
  route('GET', '/content/legal/{document}', ({ db, params }) => {
    const document = params.document
    if (document !== 'terms' && document !== 'privacy') {
      return notFound('No existe ese documento legal.')
    }
    return json(db.content.legal[document])
  }),
]
