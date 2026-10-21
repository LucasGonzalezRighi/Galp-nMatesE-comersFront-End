import { contactSchema, withdrawalSchema } from '@galpon/schemas'
import type { MockRoute } from '../router'
import type { MockDb, MockMessage } from '../types'
import { json } from '../http'
import { route } from '../router'
import { readPublicForm } from './forms'

/** Prefijo del código de comprobante de un arrepentimiento. */
const WITHDRAWAL_CODE_PREFIX = 'ARR-'

/** Cantidad de dígitos del número del código de comprobante. */
const WITHDRAWAL_CODE_DIGITS = 6

/** Identificador del próximo mensaje de la bandeja (`msg-0001`, `msg-0002`…). */
function nextMessageId(db: MockDb): string {
  return `msg-${String(db.messages.length + 1).padStart(4, '0')}`
}

/**
 * Próximo código de comprobante: `ARR-` y un número de 6 dígitos que sigue al mayor ya emitido.
 *
 * Sale de los mensajes guardados, así que no repite ningún código de la bandeja (tampoco después
 * de recargar una base persistida). Un arrepentimiento descartado por el campo trampa recibe el
 * código que seguiría, pero no se guarda: el próximo real puede llevar el mismo número.
 */
function nextWithdrawalCode(db: MockDb): string {
  let last = 0
  for (const message of db.messages) {
    if (message.code?.startsWith(WITHDRAWAL_CODE_PREFIX) !== true) continue
    const number = Number(message.code.slice(WITHDRAWAL_CODE_PREFIX.length))
    if (Number.isSafeInteger(number) && number > last) last = number
  }
  return `${WITHDRAWAL_CODE_PREFIX}${String(last + 1).padStart(WITHDRAWAL_CODE_DIGITS, '0')}`
}

/** Rutas públicas de la bandeja: el formulario de contacto y el botón de arrepentimiento. */
export const contactRoutes: readonly MockRoute[] = [
  route('POST', '/contact', async (ctx) => {
    const form = await readPublicForm(ctx, contactSchema)
    if (!form.trapped) {
      const { name, email, orderNumber, reason, message } = form.data
      const entry: MockMessage = {
        id: nextMessageId(ctx.db),
        kind: 'contact',
        name,
        email,
        orderNumber: orderNumber ?? null,
        reason,
        message,
        code: null,
        createdAt: ctx.now.toISOString(),
        read: false,
      }
      ctx.db.messages.push(entry)
    }
    return new Response(null, { status: 202 })
  }),

  route('POST', '/withdrawals', async (ctx) => {
    const form = await readPublicForm(ctx, withdrawalSchema)
    const code = nextWithdrawalCode(ctx.db)
    if (!form.trapped) {
      const { name, email, orderNumber, comment } = form.data
      const entry: MockMessage = {
        id: nextMessageId(ctx.db),
        kind: 'withdrawal',
        name,
        email,
        orderNumber: orderNumber ?? null,
        reason: null,
        message: comment ?? null,
        code,
        createdAt: ctx.now.toISOString(),
        read: false,
      }
      ctx.db.messages.push(entry)
    }
    return json({ code }, 201)
  }),
]
