# Feature `messages`

Bandeja del dashboard (`/mensajes`): los mensajes del formulario de contacto y las solicitudes de arrepentimiento (con su código `ARR-…`).

## Qué exporta (`index.ts`)

- **`MessagesScreen({ search, onSearchChange })`**: la pantalla. `PageHeader` "Mensajes", `Tabs` "Todos" · "Contacto" · "Arrepentimientos", `Checkbox` "Solo sin leer" y la lista (`ul` "Mensajes", de a 20, con `Pagination`).
- **`messagesSearchSchema`**, **`MessagesSearch`**, **`MessagesKindFilter`** y **`MESSAGES_SEARCH_DEFAULTS`**: la búsqueda de la URL, `?tipo=contacto|arrepentimiento`, `?sinLeer=1` y `?pagina=`; lo que no sirve se descarta (`.catch`). `messagesQueryOf` (interno) la traduce a la consulta de `GET /admin/messages` (`kind`, `read: false`, `page`).

## Cada mensaje

El resumen es un botón que despliega el detalle (`aria-expanded`): un punto cobre y "Sin leer" oculto si no se leyó (el nombre en `font-medium`), el nombre, `Badge` "Contacto" o "Arrepentimiento", el motivo o "Código {code}", "Pedido {número}" si hay y la fecha y hora (`formatDateTime`).

Desplegado: el email, el texto en párrafos (o "Sin comentario."), "Responder por email" (`replyMailto`: `mailto:` con el asunto "Tu consulta a Galpón Mates" o "Tu solicitud de arrepentimiento {code}"), "Ver pedido {número}" (`/pedidos/$numero`) y "Marcar como no leído", que lo pliega, devuelve el foco al resumen y avisa con un toast.

## Leído y no leído

Desplegar un mensaje sin leer lo marca leído sin confirmación (y sin toast: es parte de abrirlo). `useMarkMessage` es optimista: el mensaje cambia en su lugar (no sale de la lista aunque esté "Solo sin leer", para no esconder lo que se está leyendo) y `unreadMessages` del resumen se ajusta; si falla, vuelve y avisa con un toast de error (un `401` o un `403` los atiende la estructura). Al terminar marca la bandeja como vieja sin volver a pedir la lista abierta (`refetchType: 'none'`) e invalida `queryKeys.adminDashboard()` (contadores del menú y del resumen).

## Estados

Cargando: renglones `Skeleton`. Vacío: "No hay mensajes."; con filtros: "No hay mensajes con estos filtros." y "Limpiar filtros" (o "Ir a la primera página" si la página quedó vacía). Error: "No pudimos cargar los mensajes." con "Reintentar".

Importá la feature solo por su `index.ts`.
