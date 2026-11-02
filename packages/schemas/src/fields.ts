import { z } from 'zod'
import { ORDER_NUMBER_PATTERN, PROVINCES } from '@galpon/domain'
import { MESSAGES } from './messages'

/** Empieza con una letra y sigue con letras (con acentos y ñ), espacios, apóstrofo o guion. */
const PERSON_NAME_PATTERN = /^\p{L}[\p{L}\p{M} '’-]*$/u

/** Teléfono nacional de 10 dígitos que no empieza con 0: código de área y número, sin 15. */
const PHONE_PATTERN = /^[1-9]\d{9}$/

/** Prefijos del país en un teléfono, el más largo primero: 54 más el 9 de los celulares, o 54. */
const COUNTRY_PREFIXES = ['549', '54'] as const

/** Número de calle: de 1 a 5 dígitos, o "S/N" (sin número). */
const STREET_NUMBER_PATTERN = /^(?:\d{1,5}|S\/N)$/

/** Código postal argentino: `1414`, `B1900` o `C1414ABC`. Se compara sin distinguir mayúsculas. */
const POSTAL_CODE_PATTERN = /^[A-Z]?\d{4}[A-Z]{0,3}$/i

/** DNI sin puntos: 7 u 8 dígitos. */
const DNI_PATTERN = /^\d{7,8}$/

/**
 * Normaliza un teléfono argentino a sus 10 dígitos (código de área y número).
 *
 * Quita todo lo que no es dígito y el prefijo del país (`549` de los celulares o `54`), pero solo
 * si lo que queda tiene exactamente 10 dígitos. Ningún código de área empieza con 9, así que con
 * `549` no se prueba el `54` solo: `+54 9 11 2345 678` (un dígito de menos) no se convierte en
 * `9112345678`. El resultado puede seguir siendo inválido: quien lo llama revisa el largo y el 0
 * inicial.
 *
 * @param raw - Texto ya recortado, por ejemplo `"+54 9 11 2345-6789"`.
 * @returns `undefined` si está vacío; si no, los 10 dígitos o, si no cierran, todos los que hay.
 */
function normalizePhone(raw: string): string | undefined {
  if (raw === '') return undefined
  const digits = raw.replace(/\D/g, '')
  for (const prefix of COUNTRY_PREFIXES) {
    if (digits.startsWith(prefix)) {
      const national = digits.slice(prefix.length)
      return national.length === 10 ? national : digits
    }
  }
  return digits
}

/**
 * Email: se recorta, se pasa a minúsculas y se valida el formato (hasta 254 caracteres).
 *
 * @example
 * emailSchema.parse(' Vos@Ejemplo.com ') // "vos@ejemplo.com"
 */
export const emailSchema = z
  .string({ error: MESSAGES.invalidEmail })
  .trim()
  .toLowerCase()
  .max(254, MESSAGES.invalidEmail)
  .pipe(z.email(MESSAGES.invalidEmail))

/**
 * Nombre o apellido de la persona: de 2 a 50 caracteres, solo letras, espacios, apóstrofo y guion.
 *
 * Vacío da "Requerido", de una sola letra da "Ingresá al menos 2 letras".
 */
export const personNameSchema = z
  .string({ error: MESSAGES.required })
  .trim()
  .min(1, { error: MESSAGES.required, abort: true })
  .regex(PERSON_NAME_PATTERN, MESSAGES.onlyLetters)
  .min(2, MESSAGES.minLetters)
  .max(50, MESSAGES.max(50))

/**
 * Teléfono opcional. La salida son los 10 dígitos (código de área y número) o `undefined`.
 *
 * Acepta espacios, guiones, paréntesis y el prefijo `+54 9`; rechaza el 0 y el 15.
 *
 * @example
 * optionalPhoneSchema.parse('+54 9 11 2345 6789') // "1123456789"
 * optionalPhoneSchema.parse('') // undefined
 */
export const optionalPhoneSchema = z
  .string({ error: MESSAGES.invalidPhone })
  .trim()
  .transform(normalizePhone)
  .refine((phone) => phone === undefined || PHONE_PATTERN.test(phone), {
    error: MESSAGES.invalidPhone,
  })
  .optional()

/** Calle: de 2 a 80 caracteres. */
export const streetSchema = z
  .string({ error: MESSAGES.required })
  .trim()
  .min(2, MESSAGES.required)
  .max(80, MESSAGES.max(80))

/**
 * Número de la calle: de 1 a 5 dígitos o "S/N", que se guarda en mayúsculas.
 *
 * @example
 * streetNumberSchema.parse('s/n') // "S/N"
 */
export const streetNumberSchema = z
  .string({ error: MESSAGES.required })
  .trim()
  .min(1, { error: MESSAGES.required, abort: true })
  .toUpperCase()
  .regex(STREET_NUMBER_PATTERN, MESSAGES.invalidStreetNumber)

/**
 * Texto opcional de hasta `max` caracteres: se recorta y, si queda vacío, pasa a `undefined`.
 *
 * Sirve para los campos que el formulario deja en blanco cuando no se usan (piso, etiqueta,
 * comentario): el contrato los define como "dato ausente", nunca como texto vacío.
 *
 * @param max - Cantidad máxima de caracteres, un entero desde 1.
 * @returns Schema cuya salida es el texto recortado o `undefined`.
 * @throws {RangeError} Si `max` no es un entero desde 1.
 * @example
 * optionalTextSchema(10).parse('  ') // undefined
 * optionalTextSchema(10).parse(' 2° B ') // "2° B"
 */
export function optionalTextSchema(max: number) {
  if (!Number.isInteger(max) || max < 1) {
    throw new RangeError(
      `El máximo de caracteres tiene que ser un entero desde 1; se recibió ${String(max)}.`,
    )
  }
  return z
    .string()
    .trim()
    .max(max, MESSAGES.max(max))
    .transform((value) => (value === '' ? undefined : value))
    .optional()
}

/** Piso o departamento, opcional: hasta 10 caracteres; vacío o solo espacios queda en `undefined`. */
export const apartmentSchema = optionalTextSchema(10)

/**
 * Código postal argentino, que se guarda en mayúsculas.
 *
 * @example
 * postalCodeSchema.parse('c1414abc') // "C1414ABC"
 */
export const postalCodeSchema = z
  .string({ error: MESSAGES.invalidPostalCode })
  .trim()
  .regex(POSTAL_CODE_PATTERN, MESSAGES.invalidPostalCode)
  .toUpperCase()

/** Ciudad: de 2 a 60 caracteres. */
export const citySchema = z
  .string({ error: MESSAGES.required })
  .trim()
  .min(2, MESSAGES.required)
  .max(60, MESSAGES.max(60))

/** Provincia: una de las 24 jurisdicciones del selector (`PROVINCES`, del dominio). */
export const provinceSchema = z.enum(PROVINCES, { error: MESSAGES.invalidProvince })

/**
 * DNI: se le quitan los puntos y los espacios, y quedan 7 u 8 dígitos.
 *
 * @example
 * dniSchema.parse('12.345.678') // "12345678"
 */
export const dniSchema = z
  .string({ error: MESSAGES.invalidDni })
  .overwrite((value) => value.replace(/[.\s]/g, ''))
  .regex(DNI_PATTERN, MESSAGES.invalidDni)

/**
 * Número de pedido: se recorta, se pasa a mayúsculas y tiene que ser `GLP-` más cinco dígitos.
 *
 * @example
 * orderNumberSchema.parse(' glp-12345 ') // "GLP-12345"
 */
export const orderNumberSchema = z
  .string({ error: MESSAGES.invalidOrderNumber })
  .trim()
  .toUpperCase()
  .regex(ORDER_NUMBER_PATTERN, MESSAGES.invalidOrderNumber)

/**
 * Número de pedido opcional: como {@link orderNumberSchema}, pero ausente, vacío o solo espacios
 * quedan en `undefined`.
 *
 * @example
 * optionalOrderNumberSchema.parse(' glp-12345 ') // "GLP-12345"
 * optionalOrderNumberSchema.parse('  ') // undefined
 */
export const optionalOrderNumberSchema = z
  .string({ error: MESSAGES.invalidOrderNumber })
  .trim()
  .toUpperCase()
  .refine((value) => value === '' || ORDER_NUMBER_PATTERN.test(value), {
    error: MESSAGES.invalidOrderNumber,
  })
  .transform((value) => (value === '' ? undefined : value))
  .optional()

/**
 * Campo trampa contra bots (`website`): las personas lo dejan vacío, así que tiene que llegar vacío.
 *
 * Quien recibe un valor lo descarta en silencio, sin mostrar ningún mensaje.
 */
export const honeypotSchema = z.string().max(0).optional()

/**
 * Cantidad de unidades: un entero de 1 a `max`.
 *
 * @param max - Tope de la cantidad: el menor entre el máximo por compra y el stock.
 * @returns Schema que acepta enteros de 1 a `max`; con `max` menor que 1 no acepta ninguno.
 */
export function quantitySchema(max: number) {
  return z.int().min(1).max(max)
}
