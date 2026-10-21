import { z } from 'zod'
import { homeAddressSchema } from './checkout'
import { emailSchema, optionalTextSchema, personNameSchema } from './fields'
import { MESSAGES } from './messages'

/** Al menos una letra (con acentos y ñ). */
const LETTER_PATTERN = /\p{L}/u

/** Al menos un dígito. */
const DIGIT_PATTERN = /\d/

/**
 * Contraseña nueva: de 10 a 128 caracteres, con al menos una letra y un número.
 *
 * No se recorta: los espacios forman parte de la contraseña. Para iniciar sesión se usa
 * {@link loginPasswordSchema}, que no aplica esta regla (la cuenta puede ser anterior a ella).
 */
export const passwordSchema = z
  .string({ error: MESSAGES.weakPassword })
  .min(10, { error: MESSAGES.weakPassword, abort: true })
  .max(128, MESSAGES.max(128))
  .refine((password) => LETTER_PATTERN.test(password) && DIGIT_PATTERN.test(password), {
    error: MESSAGES.weakPassword,
  })

/**
 * Contraseña al iniciar sesión: solo tiene que estar (hasta 128 caracteres), sin la regla de
 * {@link passwordSchema}. Así el formulario no revela la política ni bloquea cuentas anteriores.
 */
export const loginPasswordSchema = z
  .string({ error: MESSAGES.required })
  .min(1, MESSAGES.required)
  .max(128, MESSAGES.max(128))

/** Alta de cuenta: email, nombre, apellido y contraseña nueva. */
export const registerSchema = z.object({
  email: emailSchema,
  firstName: personNameSchema,
  lastName: personNameSchema,
  password: passwordSchema,
})

/** Alta de cuenta como la escribe la persona, antes de normalizarla. */
export type RegisterInput = z.input<typeof registerSchema>

/** Alta de cuenta ya normalizada. */
export type Register = z.output<typeof registerSchema>

/** Inicio de sesión de la tienda: email y contraseña. */
export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
})

/** Inicio de sesión como lo escribe la persona. */
export type LoginInput = z.input<typeof loginSchema>

/** Inicio de sesión ya normalizado. */
export type Login = z.output<typeof loginSchema>

/** "Olvidé mi contraseña": solo el email. */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

/** Pedido de restablecimiento como lo escribe la persona. */
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>

/** Pedido de restablecimiento ya normalizado. */
export type ForgotPassword = z.output<typeof forgotPasswordSchema>

/**
 * Restablecer la contraseña: el código del enlace, la contraseña nueva y su confirmación.
 *
 * Si la confirmación no es igual (se distinguen mayúsculas y espacios), el error queda en
 * `passwordConfirmation` con "Las contraseñas no coinciden".
 */
export const resetPasswordSchema = z
  .object({
    token: z.string({ error: MESSAGES.required }).trim().min(1, MESSAGES.required),
    password: passwordSchema,
    passwordConfirmation: z.string({ error: MESSAGES.required }),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    error: MESSAGES.passwordMismatch,
    path: ['passwordConfirmation'],
  })

/** Restablecimiento como lo escribe la persona. */
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>

/** Restablecimiento ya normalizado. */
export type ResetPassword = z.output<typeof resetPasswordSchema>

/**
 * Dirección de la libreta de una cuenta: la dirección de domicilio más una etiqueta opcional
 * ("Casa", hasta 30 caracteres; vacía queda en `undefined`) y si es la predeterminada.
 */
export const addressBookEntrySchema = z.object({
  label: optionalTextSchema(30),
  ...homeAddressSchema.shape,
  isDefault: z.boolean(),
})

/** Dirección de la libreta como la escribe la persona, antes de normalizarla. */
export type AddressBookEntryInput = z.input<typeof addressBookEntrySchema>

/** Dirección de la libreta ya normalizada. */
export type AddressBookEntry = z.output<typeof addressBookEntrySchema>
