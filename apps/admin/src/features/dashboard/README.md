# Feature `dashboard`

La pantalla "Resumen" (`/`), la primera después de entrar.

## Qué exporta (`index.ts`)

- **`DashboardScreen({ isMockMode, today? })`**: `PageHeader` "Resumen" con la fecha (`formatLongDate` con mayúscula inicial; sin `today` se vuelve a calcular cada minuto y al volver a la pestaña, `visibilitychange`) y, en modo de prueba, la nota de que los datos son de ejemplo. Lee `adminDashboardQuery` y `adminSettingsQuery` (el umbral de poco stock) con `useApiClient()`:
  - "Ventas de hoy" y "Últimos 7 días" (`formatPesos`, `tabular-nums`), en 2 columnas desde 640 px, bajo el `h2` oculto "Ventas".
  - "Para despachar" ("Ver pedidos" → `/pedidos?estado=para-despachar`), "Reseñas pendientes" ("Moderar" → `/resenas`, pestaña de pendientes) y "Mensajes sin leer" ("Leer" → `/mensajes?sinLeer=1`), en 3 columnas desde 1024 px, bajo el `h2` oculto "Para atender". Cada tarjeta es una región con el nombre de su título (`h3`); los enlaces son botones `md` (36 px).
  - "Alertas de pago": badge `danger` ("Contracargo", "Mediación", "Pago duplicado"), el `message` y "Ver pedido {número}"; vacío: "No hay alertas de pago.".
  - "Poco stock": los publicados con `lowStockThreshold` unidades o menos, con "Sin stock" o "Quedan {n}" y "Editar" (nombre accesible "Editar {producto}"); vacío: "Ningún producto publicado tiene poco stock.".
  - Cargando: "Cargando el resumen…" oculto (`role="status"`) y esqueletos decorativos con la forma de las tarjetas. Error: "No pudimos cargar el resumen." con "Reintentar".

`today` existe para los tests (fija la fecha; por omisión, la de hoy, que se actualiza sola). Los textos están en `dashboard.copy.ts`. La feature no importa a otras: enlaza a sus pantallas con `Link` tipado y sus parámetros de búsqueda.
