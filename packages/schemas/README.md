# @galpon/schemas

Validaciones de los formularios de Galpón Mates con [Zod](https://zod.dev) 4, compartidas por la tienda, el dashboard y el modo de prueba (las reglas de la sección 15 del spec).

- **Una sola fuente de reglas y de mensajes**: la tienda y el dashboard muestran las mismas palabras, y en la fase 2 el back (NestJS) copia las mismas reglas en sus DTOs.
- **Depende solo de `zod` y de `@galpon/domain`**: de `domain` toma las provincias, el formato del número de pedido y los métodos de envío. No hay React ni red.
- **Test primero**: cada regla tiene casos válidos e inválidos con el mensaje exacto (`src/*.test.ts`).
- Exporta el código fuente (`src/index.ts`), sin paso de build; Next y Vite lo transpilan.

## Convenciones

- **Los textos se recortan antes de validar** (`.trim()`), y el schema devuelve el valor ya normalizado: email en minúsculas, código postal y número de pedido en mayúsculas, DNI sin puntos, teléfono de 10 dígitos.
- **Los mensajes salen de `MESSAGES`** (`src/messages.ts`) y están en español. Se pasan como texto (`.min(2, MESSAGES.required)`) o como `{ error }` (`.min(1, { error: MESSAGES.required, abort: true })`); no se usa `message`, que Zod 4 dejó de recomendar. Los que llevan un número son funciones: `MESSAGES.max(50)` da "Máximo 50 caracteres".
- **Un dato que falta (`undefined`) da el mismo mensaje que uno vacío.** Vale también para la dirección entera de un envío a domicilio o a sucursal: si falta (`undefined` o `null`), `shippingSchema` la trata como vacía y da un mensaje por campo (`address.street`, `address.city`, …), nunca uno suelto en `address`.
- **Cada schema de objeto exporta sus tipos** con el mismo patrón: `XInput` es lo que escribe la persona (`z.input`) y `X` lo que queda después de normalizar (`z.output`). Por ejemplo, `checkoutContactSchema` da `CheckoutContactInput` y `CheckoutContact`.
- **Un dato opcional vacío queda ausente.** El piso o departamento, el número de pedido (contacto y arrepentimiento), el comentario, la etiqueta de una dirección y los textos propios de las pestañas del producto salen `undefined` si llegan vacíos o con solo espacios (`optionalTextSchema(max)`, `optionalOrderNumberSchema`). Los datos del vendedor, que el contrato define como `string | null`, salen `null`.
- **Teléfono**: el prefijo `+54 9` o `+54` se quita solo si lo que queda son exactamente 10 dígitos; `+54 9 11 2345 678` (un dígito de menos) es inválido, no se acomoda.
- **Los errores de Zod también salen en español.** Importar `@galpon/schemas` aplica una vez el idioma `es` de Zod (`z.config(z.locales.es())` en `src/index.ts`), así un método de envío desconocido o una cantidad que no es número no muestran inglés. Quien importe un archivo suelto (como los tests de cada módulo) no pasa por `index.ts` y solo ve en español las reglas que tienen mensaje propio.
- **Contraseñas**: `passwordSchema` (10 a 128, con letras y números) es para crear o cambiar una contraseña y no recorta; `loginPasswordSchema` (solo que esté) es para iniciar sesión.
- **`toFieldErrors(error)`** pasa un `ZodError` a `{ 'address.street': 'Requerido' }`: una clave por campo, con el camino unido con puntos, y gana el primer mensaje.

```ts
import { shippingSchema, toFieldErrors } from '@galpon/schemas'

const result = shippingSchema.safeParse({ method: 'home', address: { number: '742' } })
if (!result.success) {
  toFieldErrors(result.error)
  // { 'address.street': 'Requerido', 'address.postalCode': 'Código postal inválido', ... }
}
```

## Módulos

| Módulo           | Qué resuelve                                                                                                                                                                                                                                                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `messages.ts`    | `MESSAGES`: los textos de error de la sección 15 del spec y los nuevos de los formularios del dashboard (los marcados con * allí)                                                                                                                                                                                                                                       |
| `fields.ts`      | Campos comunes: `emailSchema`, `personNameSchema`, `optionalPhoneSchema`, `streetSchema`, `streetNumberSchema` ("s/n" pasa a "S/N"), `apartmentSchema`, `postalCodeSchema`, `citySchema`, `provinceSchema`, `dniSchema`, `orderNumberSchema`, `honeypotSchema` (campo trampa `website`, tiene que llegar vacío) y `quantitySchema(max)`                                 |
| `checkout.ts`    | Los tres pasos del checkout: `checkoutContactSchema` (contacto), `homeAddressSchema`, `branchAddressSchema` y `shippingSchema` (la unión por método: domicilio, sucursal o retiro sin dirección) y `cardholderSchema` (titular de la tarjeta; con tipo "DNI" aplica la regla del DNI y con otro tipo pide de 5 a 20 letras y números)                                   |
| `form-errors.ts` | `toFieldErrors`, de `ZodError` a un mensaje por campo                                                                                                                                                                                                                                                                                                                   |
| `review.ts`      | `reviewSchema`: estrellas (1 a 5), nombre opcional (vacío sale "Anónimo"), texto (10 a 600) y campo trampa                                                                                                                                                                                                                                                              |
| `contact.ts`     | `CONTACT_REASONS` / `ContactReason` y `contactSchema` (nombre, email, n° de pedido opcional, motivo, mensaje, campo trampa)                                                                                                                                                                                                                                             |
| `withdrawal.ts`  | `withdrawalSchema`: el botón de arrepentimiento pide solo nombre y email (Disp. 954/2025); n° de pedido y comentario son opcionales                                                                                                                                                                                                                                     |
| `account.ts`     | `passwordSchema`, `loginPasswordSchema`, `registerSchema`, `loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema` (la confirmación distinta da el error en `passwordConfirmation`) y `addressBookEntrySchema`                                                                                                                                                     |
| `admin.ts`       | Formularios del dashboard: `productFormSchema`, `categoryFormSchema`, `settingsFormSchema` (descuento del kit, tres envíos, cuotas, IVA, datos del vendedor), `dispatchSchema`, `adminLoginSchema`, `adminPasswordChangeSchema`, más `slugSchema`, `imageFormSchema` y `cuitSchema` (acepta `20-12345678-6` o solo dígitos, devuelve 11 y revisa el dígito verificador) |
