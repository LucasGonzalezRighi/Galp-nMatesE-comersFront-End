import { formatDate, slugify } from '@galpon/domain'

/** Un tramo de texto de un párrafo o de un ítem: texto suelto o un enlace permitido. */
export type LegalInline =
  { kind: 'text'; text: string } | { kind: 'link'; text: string; href: string }

/** Un bloque de un documento legal (LA-1): título de sección, párrafo o lista. */
export type LegalBlock =
  | { kind: 'heading'; id: string; text: string }
  | { kind: 'paragraph'; inlines: LegalInline[] }
  | { kind: 'list'; items: LegalInline[][] }

/** Enlace en línea `[texto](destino)`. */
const LINK_PATTERN = /\[([^\]\n]+)\]\(([^)\s]+)\)/g

/** Destinos permitidos: una ruta interna (`/algo`, no `//host`) o una dirección `https://`. */
const ALLOWED_HREF = /^(\/(?!\/)|https:\/\/)/

/** Prefijo de un título de sección. */
const HEADING_PREFIX = '## '

/** Prefijo de un ítem de lista. */
const ITEM_PREFIX = '- '

/**
 * Parte un texto en tramos: los enlaces con destino permitido quedan como enlace y los demás,
 * tal cual se escribieron, como texto.
 */
function parseInlines(text: string): LegalInline[] {
  const inlines: LegalInline[] = []
  let pending = ''
  let last = 0
  for (const match of text.matchAll(LINK_PATTERN)) {
    const [whole, label = '', href = ''] = match
    pending += text.slice(last, match.index)
    last = match.index + whole.length
    if (ALLOWED_HREF.test(href)) {
      if (pending !== '') inlines.push({ kind: 'text', text: pending })
      pending = ''
      inlines.push({ kind: 'link', text: label, href })
    } else {
      pending += whole
    }
  }
  pending += text.slice(last)
  if (pending !== '') inlines.push({ kind: 'text', text: pending })
  return inlines
}

/** Convierte un bloque (líneas sin línea en blanco en el medio) en uno o dos bloques. */
function parseBlock(lines: string[]): LegalBlock[] {
  const [first = '', ...rest] = lines
  if (first.startsWith(HEADING_PREFIX)) {
    const text = first.slice(HEADING_PREFIX.length).trim()
    const heading: LegalBlock = { kind: 'heading', id: slugify(text), text }
    return rest.length === 0 ? [heading] : [heading, ...parseBlock(rest)]
  }
  if (lines.every((line) => line.startsWith(ITEM_PREFIX))) {
    return [
      {
        kind: 'list',
        items: lines.map((line) => parseInlines(line.slice(ITEM_PREFIX.length).trim())),
      },
    ]
  }
  return [{ kind: 'paragraph', inlines: parseInlines(lines.join('\n')) }]
}

/**
 * Interpreta el cuerpo de un documento legal con el formato de LA-1: bloques separados por una
 * línea en blanco; `## Título` abre una sección (con `id` = `slugify(título)`); un bloque cuyas
 * líneas empiezan todas con `- ` es una lista; lo demás es un párrafo (los saltos simples se
 * conservan). Los enlaces `[texto](destino)` valen solo con destino `/ruta` interna o `https://…`;
 * cualquier otro queda como texto. Nada de HTML: todo se dibuja como texto.
 *
 * Los marcadores `{{clave}}` se resuelven antes (`resolveLegalMarkers` de `@galpon/domain`).
 *
 * @param body - Cuerpo del documento.
 * @returns Los bloques, en orden; vacío si el texto está en blanco.
 * @throws {RangeError} Si `body` no es texto.
 * @example
 * parseLegalBody('## Uno\n\nHola.') // [{ kind: 'heading', id: 'uno', text: 'Uno' }, { kind: 'paragraph', … }]
 */
export function parseLegalBody(body: string): LegalBlock[] {
  if (typeof body !== 'string') {
    throw new RangeError(
      `El cuerpo del documento legal tiene que ser texto; se recibió ${typeof body}.`,
    )
  }
  return body
    .split(/\r?\n[^\S\r\n]*\r?\n/)
    .map((block) =>
      block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== ''),
    )
    .filter((lines) => lines.length > 0)
    .flatMap(parseBlock)
}

/**
 * Fecha de la última actualización de un documento, como `dd/mm/aaaa`.
 *
 * El contenido trae solo el día (`2026-10-01`): se toma el mediodía de Buenos Aires para que la
 * zona horaria no corra el día.
 *
 * @param updatedAt - Día en formato `aaaa-mm-dd`.
 * @throws {RangeError} Si no es un día válido.
 * @example
 * formatUpdatedAt('2026-10-01') // "01/10/2026"
 */
export function formatUpdatedAt(updatedAt: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(updatedAt)) {
    throw new RangeError(
      `La fecha de actualización tiene que ser aaaa-mm-dd; se recibió ${JSON.stringify(updatedAt)}.`,
    )
  }
  return formatDate(`${updatedAt}T12:00:00-03:00`)
}
