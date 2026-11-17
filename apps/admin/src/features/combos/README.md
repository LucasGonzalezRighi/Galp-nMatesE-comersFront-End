# Feature `combos`

Los combos del inicio de la tienda (`/combos`, en el menú después de "Líneas"): 2 o 3 productos
fijos de grupos distintos (a lo sumo un mate) con un precio final que escribe el admin, su orden,
el alta, la edición y el borrado.

## Qué exporta (`index.ts`)

- **`CombosScreen()`**: la pantalla entera. No recibe props: lee los combos con
  `adminCombosQuery`, los productos publicados con `adminProductsQuery` (`status: 'published'`,
  `pageSize: 100`, como el contenido del inicio) y escribe con los servicios de `@galpon/api-client`.

## Lista y avisos

`SortableList` vertical, como Líneas: agarradera "Arrastrar {nombre}", "Subir" / "Bajar", orden
optimista (`useReorderCombos`, `PUT /admin/combos/order` con todos los ids; si falla vuelve al
anterior y avisa). Cada fila (`ComboRow`) muestra las fotos de las piezas, el nombre, las piezas
("A + B"), el precio final, el ahorro, el estado y los avisos de `comboWarnings`:

- **"Pieza no disponible"**: una pieza no está publicada, no tiene precio o ya no existe. La
  tienda no muestra el combo y el servidor no lo deja guardar hasta cambiar esa pieza.
- **"Sin stock"**: una pieza se agotó; la tienda lo muestra agotado.
- **"Sin ahorro"**: las piezas bajaron y ya suman lo mismo o menos que el combo (se cobra el
  precio del combo, sin ahorro).

## Crear y editar

`ComboFormDialog` (`comboDialogSchema` = `comboFormSchema` con el precio vacío al empezar):
nombre, descripción, una lista por grupo (Mate, Bombilla, Yerba: "Sin {grupo}" y los publicados
con precio, "Nombre · $precio"; mínimo 2), precio final (`MoneyInput`) y estado (borrador o
publicado; uno nuevo arranca en borrador). Las piezas se guardan en el orden de los grupos. Una
pieza guardada que ya no se vende aparece "(no disponible)" con una ayuda; una sin stock, con
"Sin stock: el combo se ve agotado en la tienda.".

El resumen en vivo dice "Suma de las piezas $X · Ahorro $Y" (`sumPesos` y `comboSavings` del
dominio) y avisa si el precio no es menor que la suma. La regla la valida el servidor: el `422`
llega por campo (`productIds.N` a la lista de esa pieza, `productIds` debajo de las piezas,
`priceArs` al precio, con los mensajes de `MESSAGES`) y, si trae una ruta que el formulario no
dibuja, también un toast con el mensaje general. Con una sola pieza no se llega al servidor:
"Cargá de 2 a 3 productos". Cerrar con cambios pregunta "¿Descartar los cambios?".

## Borrar

`DeleteComboDialog` + `useDeleteCombo`: un combo se borra siempre (los pedidos guardan su copia).
Al borrar, el foco va al título.

## Cuándo se ve en la tienda

Guardar, borrar u ordenar invalida `queryKeys.adminCombos()`: el dashboard se ve al instante.

- **En vivo:** el back guarda y avisa `POST /api/revalidate` con la etiqueta `combos` (y
  `products` cuando cambian precio o stock de una pieza); la tienda lee los combos con
  `cacheTag('combos', 'products')`. Falta en el back: los endpoints de combos y su aviso a la
  tienda (`storefront-sync`), que hoy no existe.
- **En modo de prueba:** el dashboard y la tienda no comparten base (ADR 0003): lo que se guarda
  acá vive en el `sessionStorage` del navegador y la tienda no lo ve. Para probar la tienda, las
  escrituras van contra la base de la tienda (`/api/v1/admin/combos` del servidor de Next, con la
  cookie del login de prueba y `X-CSRF-Token`; ver "Admin de la API simulada" en el README de la
  tienda).

## Archivos

- `combos.copy.ts`: textos y los armados ("Arrastrar {nombre}", "A + B", "Suma de las piezas…").
- `combo-form-values.ts`: valores iniciales, `comboDialogSchema`, las piezas de cada lista, el
  cambio de una pieza y el resumen.
- `combo-warnings.ts`: los avisos de la fila.
- `use-save-combo.ts`, `use-reorder-combos.ts`, `use-delete-combo.ts`: las escrituras.

Importá la feature solo por su `index.ts`.
