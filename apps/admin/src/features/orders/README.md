# Feature `orders`

Pedidos del dashboard: la tabla `/pedidos` y el detalle `/pedidos/$numero`, con los cambios de
estado que permite `adminOrderTargets` de `@galpon/domain`.

## Qué exporta (`index.ts`)

- **`OrdersScreen({ search, onSearchChange, storeUrl })`**: filtros, tabla (20 por página) y
  paginación. `search` son los filtros de la URL ya validados; `onSearchChange` los cambia.
- **`ordersSearchSchema`** y el tipo **`OrdersSearch`**: `?estado=` (un `OrderStatus` o
  `para-despachar`, que pide `status=paid&status=preparing`), `?pago=` y `?pagina=`, con `.catch`
  para descartar lo que no sirve. La ruta lo usa en `validateSearch`.
- **`OrderScreen({ number })`**: el detalle de un pedido, sus avisos de pago y sus acciones.
  Mientras carga, "Cargando el pedido…" oculto (`role="status"`) y la forma de las secciones.
- **`resetOrdersSearch()`**: vacía la búsqueda en memoria (ver abajo).

## Búsqueda fuera de la URL

El texto de "Buscar" (número, email o nombre) tiene datos personales, así que **no** va en la
URL (§16, Ruling P4-7): vive en `useOrdersSearchStore` (`orders-search.store.ts`, zustand en
memoria), se aplica 300 ms después de la última tecla y sobrevive a ir al detalle y volver, pero
no a recargar ni a "Cerrar sesión": `resetOrdersSearch` (exportada por `index.ts`) la vacía y la
llama `app/AdminLayout.tsx` al cerrar la sesión.

## Cambios de estado

`OrderStatusActions` ofrece solo los destinos de `adminOrderTargets`: "Pasar a preparación" (sin
confirmar; mientras guarda dice "Pasando a preparación…" con spinner), "Marcar como despachado" (`ShipOrderDialog`, validado con `orderStatusChangeSchema`),
"Marcar como entregado" y "Cancelar pedido" (con `ConfirmDialog`). Con un pago en curso explica
por qué no se puede cancelar (`checkOrderTransition`). `useOrderStatusChange` hace la escritura:

- con éxito invalida `queryKeys.adminOrder(number)`, `adminOrdersAll()` y `adminDashboard()`;
- un `409` (`invalid_status_transition`, `payment_in_progress`) muestra un toast con el `message`
  del servidor, cierra el diálogo y recarga el pedido;
- un `422` va a cada campo del despacho; un `401` o `403` los maneja la estructura del admin.

## Archivos

- `orders.copy.ts`: textos, badges de estado del pedido y del pago, envíos y detalles de pago.
- `orders.constants.ts`: `MERCADO_PAGO_PAYMENT_URL` (a confirmar con la cuenta real), la espera
  de la búsqueda y los largos máximos.
- `order-format.ts`: montos, hora, dirección, medio y detalle del pago, enlace a Mercado Pago.

Importá la feature solo por su `index.ts`.
