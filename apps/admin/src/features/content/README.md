# Feature `content`

Contenido del sitio: las seis pantallas de `/contenido/*` (inicio, Nosotros, preguntas
frecuentes, pestañas de la ficha, pie y legales). `/contenido` redirige a `/contenido/inicio`
(lo hace la ruta).

## Qué exporta (`index.ts`)

- **`HomeContentScreen`**, **`AboutContentScreen`**, **`FaqContentScreen`**,
  **`ProductTabsContentScreen`**, **`FooterContentScreen`**: sin props; cada una pide su página
  con `adminContentQuery(api, página)` y la guarda entera con su servicio `updateAdmin…Content`.
- **`LegalContentScreen({ tab, onTabChange })`**: pestañas "Términos y condiciones" ·
  "Política de privacidad". `tab` es `?documento=` ya validado; `onTabChange` cambia la URL.
- **`legalSearchSchema`** y **`LEGAL_SEARCH_DEFAULTS`** (`?documento=terminos|privacidad`, con
  `.catch`): la ruta los usa en `validateSearch` y `stripSearchParams`.

## Cómo está armada cada pantalla

- `ContentLayout`: `PageHeader` "Contenido" con la nota sobre el formato y `ContentNav`
  ("Secciones del contenido", enlaces con estilo de pestaña; `Link` pone `aria-current="page"`).
- `ContentLoader`: esqueleto mientras carga, "No pudimos cargar el contenido." con "Reintentar" o
  el formulario (`combinedLoadState` junta varias consultas: el inicio también pide los productos
  publicados, `adminProductsQuery` con `status: 'published'` y `pageSize: 100`). El error solo
  reemplaza al formulario si nunca hubo datos: una recarga en segundo plano que falla (sesión
  vencida, corte de red) lo deja montado, con lo escrito; por eso las pantallas dibujan el
  formulario con `data !== undefined` y no con `isSuccess`.
- Un formulario por pantalla con React Hook Form, `zodResolver(*ContentFormSchema)` de
  `@galpon/schemas` (mensajes y límites de ahí), `mode: 'onTouched'`, `FormProvider`,
  `FormActions` ("Guardar cambios") y `UnsavedChangesGuard`.
- `useSaveContent`: el `PUT` con la página completa; con éxito deja lo guardado en la caché
  (`queryKeys.adminContent(página)` o `adminLegalContent(documento)`), hace `reset` con los
  valores nuevos y avisa "Contenido guardado."; un `422` va a cada campo con `setError` (rutas con
  índice, como `scenes.2.text` o `partners.1.photo.publicId`); otro error, a un toast. El `401` y
  el `403` los maneja la estructura.
- Piezas: `TextField` (campo registrado con su error), `TextListField` y `TitleLinesField` (de 1
  a 3 "Línea {n}", "Agregar línea", "Quitar la línea {n}"), `FieldGroup` (recuadro con título y
  acciones, `role="group"`), `ItemActions` (agarradera, "Subir", "Bajar", "Quitar").

## Reglas propias

- **`content-form-values.ts`**: la ida, de la API al formulario (opcionales `null` → `""`; en
  Nosotros, `Image` → `ImageInput` sin `url`, y `aboutPhotoUrls` guarda la `url` de cada foto
  para mostrarla). La vuelta es la salida del schema, que ya es el cuerpo del `PUT`.
- **Socios**: cada uno con `useSingleImageUpload({ purpose: 'partner' })`. Al terminar la subida,
  la foto pasa al formulario como `ImageInput` (texto alternativo = el nombre si tiene 3
  caracteres o más) y sale de la cola. No se envía con una foto subiendo ("Esperá a que terminen
  de subir las fotos.") o con error ("Hay fotos que no se subieron: reintentá o quitalas.").
- **Preguntas**: `SortableList` en las categorías y en las preguntas de cada una, con `move()` de
  `useFieldArray` (`findMove`). Una categoría nueva toma su identificador de `slugify(nombre)`
  hasta que se lo cambia a mano. `faqContentFormSchema` no controla identificadores repetidos
  (el identificador va en la URL y es la clave de la lista): antes de enviar, el formulario marca
  el segundo con "Ya hay otra categoría con este identificador.".
- **Legales**: al cambiar el texto se propone como "Última actualización" el día de hoy en Buenos
  Aires (`arDayKey`), salvo que la fecha se haya cambiado a mano.

Importá la feature solo por su `index.ts`.
