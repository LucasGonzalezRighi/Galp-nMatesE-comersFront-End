import { z } from 'zod'
import {
  apartmentSchema,
  citySchema,
  dniSchema,
  emailSchema,
  optionalPhoneSchema,
  personNameSchema,
  postalCodeSchema,
  provinceSchema,
  streetNumberSchema,
  streetSchema,
} from './fields'
import { MESSAGES } from './messages'

/** Paso 1 del checkout, Contacto: email, nombre, apellido y teléfono opcional. */
export const checkoutContactSchema = z.object({
  email: emailSchema,
  firstName: personNameSchema,
  lastName: personNameSchema,
  phone: optionalPhoneSchema,
})

/** Datos de contacto como los escribe la persona, antes de normalizarlos. */
export type CheckoutContactInput = z.input<typeof checkoutContactSchema>

/** Datos de contacto ya normalizados: email en minúsculas y teléfono de 10 dígitos. */
export type CheckoutContact = z.output<typeof checkoutContactSchema>

/**
 * Dirección del envío a domicilio.
 *
 * Los campos van en el mismo orden que `ADDRESS_FIELDS_BY_METHOD.home` del dominio.
 */
export const homeAddressSchema = z.object({
  street: streetSchema,
  number: streetNumberSchema,
  apartment: apartmentSchema,
  postalCode: postalCodeSchema,
  city: citySchema,
  province: provinceSchema,
})

/** Dirección de domicilio como la escribe la persona, antes de normalizarla. */
export type HomeAddressInput = z.input<typeof homeAddressSchema>

/** Dirección de domicilio ya normalizada. */
export type HomeAddress = z.output<typeof homeAddressSchema>

/**
 * Dirección del envío a sucursal: solo código postal, ciudad y provincia.
 *
 * Los campos van en el mismo orden que `ADDRESS_FIELDS_BY_METHOD.branch` del dominio.
 */
export const branchAddressSchema = z.object({
  postalCode: postalCodeSchema,
  city: citySchema,
  province: provinceSchema,
})

/** Dirección de sucursal como la escribe la persona, antes de normalizarla. */
export type BranchAddressInput = z.input<typeof branchAddressSchema>

/** Dirección de sucursal ya normalizada. */
export type BranchAddress = z.output<typeof branchAddressSchema>

/**
 * Paso 2 del checkout, Envío: el método elegido y la dirección que ese método pide.
 *
 * El retiro en persona no lleva dirección; si llega alguna de más, se descarta.
 */
export const shippingSchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('home'), address: homeAddressSchema }),
  z.object({ method: z.literal('branch'), address: branchAddressSchema }),
  z.object({ method: z.literal('pickup') }),
])

/** Envío como lo arma el formulario, antes de normalizar la dirección. */
export type ShippingInput = z.input<typeof shippingSchema>

/** Envío ya normalizado. */
export type Shipping = z.output<typeof shippingSchema>

/** Documento de un tipo que no es DNI: de 5 a 20 letras y números. */
const otherDocumentSchema = z
  .string({ error: MESSAGES.invalidDocument })
  .trim()
  .regex(/^[A-Za-z0-9]{5,20}$/, MESSAGES.invalidDocument)

/**
 * Elige la regla del número de documento según su tipo.
 *
 * @param identificationType - Tipo que devuelve Mercado Pago, por ejemplo `"DNI"` o `"CUIT"`.
 * @returns `dniSchema` para `"DNI"`; para cualquier otro tipo, letras y números de 5 a 20.
 */
function documentSchemaFor(identificationType: string) {
  return identificationType === 'DNI' ? dniSchema : otherDocumentSchema
}

/**
 * Titular de la tarjeta (paso 3, Pago, con tarjeta): nombre como figura en la tarjeta y documento.
 *
 * Con tipo `"DNI"` el número sigue la regla del DNI y sale sin puntos; con otro tipo, 5 a 20
 * letras y números. El documento se revisa aunque el nombre tenga errores, así el formulario
 * puede mostrar todos los errores juntos.
 */
export const cardholderSchema = z
  .object({
    cardholderName: z
      .string({ error: MESSAGES.cardholderName })
      .trim()
      .min(2, MESSAGES.cardholderName)
      .max(60, MESSAGES.max(60)),
    identificationType: z.string({ error: MESSAGES.required }).trim().min(1, MESSAGES.required),
    identificationNumber: z.string({ error: MESSAGES.required }),
  })
  .check((ctx) => {
    const { identificationType, identificationNumber } = ctx.value
    const result = documentSchemaFor(identificationType).safeParse(identificationNumber)
    if (result.success) return
    for (const issue of result.error.issues) {
      ctx.issues.push({
        code: 'custom',
        input: identificationNumber,
        path: ['identificationNumber'],
        message: issue.message,
      })
    }
  })
  .transform((value) => ({
    ...value,
    // La revisión de arriba ya garantizó que el número cumple la regla de su tipo.
    identificationNumber: documentSchemaFor(value.identificationType).parse(
      value.identificationNumber,
    ),
  }))

/** Titular de la tarjeta como lo escribe la persona, antes de normalizar el documento. */
export type CardholderInput = z.input<typeof cardholderSchema>

/** Titular de la tarjeta ya normalizado. */
export type Cardholder = z.output<typeof cardholderSchema>
