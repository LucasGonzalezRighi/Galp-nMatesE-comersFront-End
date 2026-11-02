# Feature `reviews`

Moderación de reseñas del dashboard (`/resenas`): solo las aprobadas se ven en la ficha del producto y cuentan en el promedio; las destacadas aprobadas aparecen en el inicio de la tienda.

## Qué exporta (`index.ts`)

- **`ReviewsScreen({ search, onSearchChange, storeUrl })`**: la pantalla. `PageHeader` "Reseñas", `Tabs` "Pendientes" (con `pendingReviews` de `adminDashboardQuery`) · "Aprobadas" · "Ocultas" y una tarjeta por reseña (de a 20, con `Pagination`): estrellas con "{n} de 5 estrellas" oculto, el producto (`h2`, enlace a `{storeUrl}/producto/{slug}` en una pestaña nueva), autor, fecha (`formatDate`), "Compra verificada" y "Destacada", el texto en párrafos y las acciones de su estado.
- **`reviewsSearchSchema`**, **`ReviewsSearch`**, **`ReviewsTab`** y **`REVIEWS_SEARCH_DEFAULTS`**: la búsqueda de la URL, `?estado=pendientes|aprobadas|ocultas` y `?pagina=`; lo que no sirve vuelve a pendientes y a la página 1 (`.catch`). La ruta saca los valores por omisión de la URL con `stripSearchParams`.

## Moderar

| Estado    | Acciones                                                     |
| --------- | ------------------------------------------------------------ |
| Pendiente | "Aprobar" (principal) · "Ocultar"                            |
| Aprobada  | "Destacar en el inicio" o "Quitar de destacadas" · "Ocultar" |
| Oculta    | "Aprobar" · "Volver a pendientes"                            |

Las reglas viven en `review-actions.ts` (`availableReviewActions`, `REVIEW_ACTIONS`, `reviewAfter`). Nada pide confirmación: todo es reversible y avisa con un toast ("Reseña aprobada.", "Reseña oculta.", "Reseña destacada en el inicio.", "Reseña quitada de destacadas.", "La reseña volvió a pendientes.").

`useModerateReview` es optimista: la tarjeta sale de su pestaña al instante (el foco pasa a la tarjeta vecina) y el contador de pendientes se ajusta; si el `PATCH` falla, todo vuelve y avisa con un toast de error (el `message` del `ApiError`; un `401` o un `403` los atiende la estructura del dashboard). Al terminar invalida `queryKeys.adminReviewsAll()` y `queryKeys.adminDashboard()` (contadores del menú y del resumen).

## Estados

Cargando: "Cargando las reseñas…" oculto (`role="status"`) y tarjetas `Skeleton` decorativas. Vacío: "No hay reseñas para moderar." · "Todavía no hay reseñas aprobadas." · "No hay reseñas ocultas.", con un atajo a otra pestaña (o "Ir a la primera página" si la página quedó vacía). Error: "No pudimos cargar las reseñas." con "Reintentar".

Importá la feature solo por su `index.ts`.
