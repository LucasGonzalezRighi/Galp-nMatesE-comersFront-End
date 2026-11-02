import type { ApiClient } from '../client'
import type { ContactInput, WithdrawalInput, WithdrawalReceipt } from '../generated/schema'
import { unwrap, unwrapVoid } from '../unwrap'

/**
 * Mensaje de contacto como lo arma el formulario: el número de pedido y el campo trampa pueden
 * faltar (el contrato los pide, con `null` cuando no corresponden).
 */
export interface ContactSubmission extends Omit<ContactInput, 'orderNumber' | 'website'> {
  /** Número del pedido del que se trata (`GLP-12345`); sin él, `null`. */
  orderNumber?: ContactInput['orderNumber']
  /** Campo trampa contra bots: las personas lo dejan vacío. */
  website?: ContactInput['website']
}

/**
 * Pedido de arrepentimiento como lo arma el formulario: el número de pedido, el comentario y el
 * campo trampa pueden faltar (el contrato los pide, con `null` cuando no corresponden).
 */
export interface WithdrawalSubmission extends Omit<
  WithdrawalInput,
  'orderNumber' | 'comment' | 'website'
> {
  /** Número del pedido que se quiere devolver (`GLP-12345`); sin él, `null`. */
  orderNumber?: WithdrawalInput['orderNumber']
  /** Comentario opcional, de hasta 2000 caracteres; sin él, `null`. */
  comment?: WithdrawalInput['comment']
  /** Campo trampa contra bots: las personas lo dejan vacío. */
  website?: WithdrawalInput['website']
}

/**
 * Manda el mensaje del formulario de contacto, que queda en la bandeja del dashboard.
 *
 * @param api - Cliente de la API.
 * @param input - Datos del formulario; lo que falte entre lo opcional viaja como `null`.
 * @throws {ApiError} Si la llamada falla (`validation` con el mensaje de cada campo si los datos
 *   no son válidos, `rate_limited` si hubo demasiados envíos).
 */
export function sendContactMessage(api: ApiClient, input: ContactSubmission): Promise<void> {
  return unwrapVoid(
    api.POST('/contact', {
      body: {
        name: input.name,
        email: input.email,
        orderNumber: input.orderNumber ?? null,
        reason: input.reason,
        message: input.message,
        website: input.website ?? null,
      },
    }),
  )
}

/**
 * Registra una solicitud de arrepentimiento (el botón de arrepentimiento de la tienda).
 *
 * @param api - Cliente de la API.
 * @param input - Datos del formulario; lo que falte entre lo opcional viaja como `null`.
 * @returns El comprobante, con el código para que la persona haga el seguimiento.
 * @throws {ApiError} Si la llamada falla (`validation` con el mensaje de cada campo si los datos
 *   no son válidos, `rate_limited` si hubo demasiados envíos).
 */
export function requestWithdrawal(
  api: ApiClient,
  input: WithdrawalSubmission,
): Promise<WithdrawalReceipt> {
  return unwrap(
    api.POST('/withdrawals', {
      body: {
        name: input.name,
        email: input.email,
        orderNumber: input.orderNumber ?? null,
        comment: input.comment ?? null,
        website: input.website ?? null,
      },
    }),
  )
}
