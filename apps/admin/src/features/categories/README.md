# Feature `categories`

Las líneas de productos del dashboard (`/lineas`): su orden en la tienda, el alta, la edición y
el borrado.

## Qué exporta (`index.ts`)

- **`CategoriesScreen()`**: la pantalla entera. No recibe props: lee las líneas con
  `adminCategoriesQuery` y escribe con los servicios de `@galpon/api-client`. Necesita el
  `ImageUploaderProvider` que monta `routes/_authenticated.tsx` (en los tests, el test lo monta
  con `createSimulatedUploader`).

## Orden

`SortableList` vertical (agarradera "Arrastrar {nombre}", "Subir {nombre}" / "Bajar {nombre}" y
las flechas desde la agarradera). El orden es optimista: la pantalla pasa el orden nuevo a la
lista en el mismo cuadro (estado local, porque si se esperara a la caché y el guardado fallara
antes de dibujarla, la lista no vería volver el anterior) y `useReorderCategories` lo pone en la
caché y hace `PUT /admin/categories/order` con todos los ids. Si falla, vuelve al anterior y
avisa "No pudimos guardar el orden. Volvimos al anterior."; si sale bien, "Orden guardado.".

## Crear y editar

`CategoryFormDialog` (`categoryFormSchema`): el slug sigue al nombre (`slugify`) solo al crear y
hasta que se lo toca a mano; la foto usa `useSingleImageUpload({ purpose: 'category' })` y, al
terminar de subir, pasa al formulario (su texto alternativo vacío toma el nombre). No guarda con
una foto subiendo o con error. `409 slug_taken` (no trae `fieldErrors`) va al campo "Slug" por
su `type`; un `422`, a cada campo (`image.publicId` se muestra en la foto). Cerrar con cambios
pregunta "¿Descartar los cambios?". La pantalla le cambia la `key` en cada apertura.

## Borrar

`DeleteCategoryDialog`: el back cuenta productos de cualquier estado y `productCount` solo los
publicados, así que no se decide con el contador. El `409 category_has_products` se explica
dentro del diálogo (`role="alert"`) y el diálogo queda abierto.

## Archivos

- `categories.copy.ts`: textos, nombres de los grupos y los armados ("Arrastrar {nombre}",
  "{n} publicados", "/tienda/{slug}").
- `category-form-values.ts`: valores iniciales del formulario y el largo de la bajada.
- `use-reorder-categories.ts`, `use-save-category.ts`: las escrituras.

Importá la feature solo por su `index.ts`.
