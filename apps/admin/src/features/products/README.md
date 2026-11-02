# Feature `products`

Productos del dashboard: la tabla `/productos` y el formulario de `/productos/nuevo` y
`/productos/$id`, con sus fotos.

## Qué exporta (`index.ts`)

- **`ProductsScreen({ search, onSearchChange, storeUrl })`**: "Nuevo producto", los filtros, la
  tabla (24 por página), el orden y la paginación. `search` son los filtros de la URL ya validados.
- **`productsSearchSchema`**: `?q=`, `?linea=` (slug de la línea), `?estado=` (sin él,
  publicados y borradores), `?sinStock=1`, `?orden=` (`az`, `menor`, `mayor`; sin él, por código)
  y `?pagina=`, con `.catch` para descartar lo que no sirve. El tipo `ProductsSearch` queda
  adentro de la feature (la ruta lo infiere del schema).
- **`NewProductScreen()`** y **`ProductScreen({ id })`**: el formulario vacío y el de un producto
  guardado (con su código y sus fechas; "No encontramos ese producto." si no existe).

## Listado

"Buscar" pasa a la URL 300 ms después de la última tecla (`use-debounced-value.ts`). La tabla
marca "Sin stock" con 0 y, solo en los publicados, "Poco stock" hasta el `lowStockThreshold` de
los ajustes. "Archivar" pide confirmación (`ConfirmDialog`) y usa `useArchiveProduct`.

Una `?pagina=` más allá de la última (por ejemplo, después de archivar el último producto de la
última página) muestra "Esta página ya no tiene productos." con "Ir a la primera página", en vez
de "Todavía no hay productos.". No redirige sola: `onSearchChange` agrega una entrada al historial
y "Atrás" volvería a la página vacía. Si una recarga en segundo plano falla, la tabla sigue con
los datos que tenía y arriba se avisa "No pudimos actualizar la lista…" con "Reintentar"; el error
solo reemplaza a la tabla si nunca cargó.

## Formulario (`ProductForm`)

- `productFormValuesSchema` (`product-form-values.ts`) es `productFormSchema` más lo que necesita
  la pantalla: la casilla "Precio a consultar" (sin ella el precio es obligatorio; la regla va en
  un objeto aparte unido con `.and`, porque un refinamiento del objeto entero no corre si otro
  campo ya cortó la validación), el stock vacío mientras no se escribe y la `url` de cada foto.
  `toProductFormValues` y `toAdminProductInput` pasan de la API al formulario y de vuelta (fotos
  sin `url`, precio `null` "a consultar", `tabsOverride` vacío → `null`).
- Al crear, el slug sigue a `slugify(nombre)` hasta que se lo toca; al editar muestra la
  redirección del slug viejo y las direcciones anteriores.
- **Fotos** (`ProductPhotosField`): la cola es `useImageUploads` de `components/media`, con
  `purpose: 'product'` y `max: 8`. Cuando una foto termina pasa al formulario (con el nombre del
  producto como texto alternativo) y sale de la cola con `remove(id)`, así el cupo no la cuenta
  dos veces. Se ordenan con `SortableList` (botones, agarradera y flechas). No se envía con
  subidas en curso ni con fotos en error.
- **Guardar** (`useSaveProduct`): al editar manda `expectedUpdatedAt` = el `updatedAt` de la
  versión que se abrió (no el de la caché, que puede haberse recargado). `409 slug_taken` va al
  campo "Slug"; `409 product_changed` abre "Este producto cambió mientras lo editabas" con
  "Guardar mis cambios igual" (sin `expectedUpdatedAt`) y "Ver la versión guardada" (recarga y
  descarta, solo con el botón). Escape (`onEscape` de `ConfirmDialog`) cierra el aviso y conserva
  lo escrito. Un `422` va a cada campo (`images.N.alt`); un `401` o un `403` los maneja la
  estructura.
- Un archivado muestra el aviso con "Volver a publicar" (`useRepublishProduct`: lo guardado con
  `status: 'published'`; lo editado y sin guardar se conserva; mientras guarda dice
  "Publicando…"). Guardar cambios de un archivado lo
  deja en borrador (la API solo recibe borrador o publicado; en la tienda se ven igual, ninguno):
  el estado "Archivado" lo avisa de antemano y el toast dice "Cambios guardados. El producto pasó
  de archivado a borrador.".
- Después de escribir, `refreshProductCaches` deja el producto en la caché e invalida la lista,
  las líneas (`productCount`) y el resumen.

## Archivos

- `products.copy.ts`: textos, badges de estado y nombres de los grupos (como en Contenido ›
  Pestañas).
- `products.constants.ts`: página de 24, espera de la búsqueda, cupo de fotos y largos máximos.
- `product-format.ts`: precio ("A consultar") y badge del stock.

Importá la feature solo por su `index.ts`.
