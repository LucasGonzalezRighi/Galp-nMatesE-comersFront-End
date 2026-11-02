import { z } from 'zod'
import {
  emailSchema,
  honeypotSchema,
  optionalOrderNumberSchema,
  optionalTextSchema,
  personNameSchema,
} from './fields'

/**
 * Botón de arrepentimiento: nombre y email, y nada más que sea obligatorio.
 *
 * La Disposición 954/2025 no permite exigir otros datos para ejercer el arrepentimiento, así que
 * el número de pedido y el comentario son opcionales (vacíos quedan en `undefined`).
 *
 * - `name`: como el nombre del checkout (2 a 50 caracteres, solo letras).
 * - `orderNumber`: opcional, con el formato `GLP-12345`.
 * - `comment`: opcional, hasta 2000 caracteres.
 * - `website`: campo trampa contra bots, tiene que llegar vacío.
 */
export const withdrawalSchema = z.object({
  name: personNameSchema,
  email: emailSchema,
  orderNumber: optionalOrderNumberSchema,
  comment: optionalTextSchema(2000),
  website: honeypotSchema,
})

/** Pedido de arrepentimiento como lo escribe la persona, antes de normalizarlo. */
export type WithdrawalInput = z.input<typeof withdrawalSchema>

/** Pedido de arrepentimiento ya normalizado. */
export type Withdrawal = z.output<typeof withdrawalSchema>
