import { z } from 'zod'
import { emailSchema, honeypotSchema, optionalOrderNumberSchema } from './fields'
import { MESSAGES } from './messages'

/** Motivos del formulario de contacto, en el orden en que se ofrecen. */
export const CONTACT_REASONS = ['Pedido', 'Envío', 'Cambio', 'Arrepentimiento', 'Otro'] as const

/** Uno de los motivos de {@link CONTACT_REASONS}. */
export type ContactReason = (typeof CONTACT_REASONS)[number]

/**
 * Formulario de contacto.
 *
 * - `name`: de 2 a 50 caracteres.
 * - `orderNumber`: opcional, con el formato `GLP-12345`; vacío queda en `undefined`.
 * - `reason`: uno de {@link CONTACT_REASONS}.
 * - `message`: de 10 a 2000 caracteres.
 * - `website`: campo trampa contra bots, tiene que llegar vacío.
 */
export const contactSchema = z.object({
  name: z
    .string({ error: MESSAGES.contactName })
    .trim()
    .min(2, MESSAGES.contactName)
    .max(50, MESSAGES.max(50)),
  email: emailSchema,
  orderNumber: optionalOrderNumberSchema,
  reason: z.enum(CONTACT_REASONS, { error: MESSAGES.invalidContactReason }),
  message: z
    .string({ error: MESSAGES.contactMessage })
    .trim()
    .min(10, MESSAGES.contactMessage)
    .max(2000, MESSAGES.max(2000)),
  website: honeypotSchema,
})

/** Mensaje de contacto como lo escribe la persona, antes de normalizarlo. */
export type ContactInput = z.input<typeof contactSchema>

/** Mensaje de contacto ya normalizado. */
export type Contact = z.output<typeof contactSchema>
