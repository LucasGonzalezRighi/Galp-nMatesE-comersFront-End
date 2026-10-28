# Feature `settings`

Los ajustes de la tienda (`/ajustes`), en una sola página.

## Qué exporta (`index.ts`)

- **`SettingsScreen()`**: carga los ajustes (`adminSettingsQuery`) y muestra `SettingsForm`,
  con su esqueleto mientras carga y "No pudimos cargar los ajustes." con "Reintentar".

## Formulario

`SettingsForm` (`settingsFormSchema`, con `FormActions` y `UnsavedChangesGuard`), por secciones:
"Kit", "Envíos" (`ShippingOptionFields`: una fila por método con su nombre fijo; con costo 0 la
ayuda dice "Gratis"), "Cuotas", "Precio sin impuestos nacionales" (con la condición fiscal del
vendedor), "Vendedor y atención al cliente" (`SellerFields`), "Contacto" y "Stock".

Al guardar avisa "Ajustes guardados.", vuelve a arrancar con lo guardado e invalida los ajustes
y el resumen. Un `422` va a cada campo por su ruta (`SETTINGS_FIELDS`: `seller.cuit`,
`shippingOptions.0.costArs`) y, si trae alguna ruta que el formulario no dibuja, además un toast
con el mensaje general; otro error, a un toast. El `401` y el `403` los maneja la estructura del
dashboard.

## Archivos

- `settings.copy.ts`: textos y el nombre fijo de cada método de envío.
- `settings-form-values.ts`: `settingsFormValues` (de la API al formulario: envíos en el orden de
  `SHIPPING_METHODS`, CUIT con `formatCuit`, datos sin cargar como texto vacío),
  `settingsInput` (del formulario a `PUT /admin/settings`, con el nombre de cada envío),
  `shippingFieldPath` y `SETTINGS_FIELDS`.

Importá la feature solo por su `index.ts`.
