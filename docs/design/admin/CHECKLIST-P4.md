# Lista de control visual de P4 (dashboard)

El admin no tiene un diseño exportado: cada captura se compara contra las reglas de interfaz del plan de P4 (Global Constraints, "Interfaz del admin") y contra los textos de los `*.copy.ts` de cada feature, a 1440 px y a 390 px.

- **Cómo se generan las capturas**: `npm run build` y `npx playwright test e2e/admin/visual.spec.ts --project=admin-desktop` (con el admin servido por `vite preview`, que manda la CSP). `playwright.config.ts` levanta también la tienda (`npm run start -w @galpon/store`), así que compilar solo el admin no alcanza, salvo con la tienda ya levantada en el puerto 3000 o con una config que levante solo el admin. Cada prueba abre un contexto nuevo (una base de demostración recién sembrada), entra con la cuenta de prueba, espera a que no quede nada cargando (`aria-busy`, `Skeleton`, listas desplegables sin opciones) ni falten los contadores del menú, y guarda `test-results/visual/admin-{pantalla}-{1440|390}.png`: página completa para las pantallas y solo la ventana para los diálogos y el menú abierto. Con movimiento reducido, para que los diálogos salgan abiertos del todo.
- **Cómo se revisó**: cada captura a ojo (estructura, textos, tokens y tipografía, 390 px). Las otras columnas salen de las pruebas: axe con `e2e/admin/a11y.spec.ts` (WCAG 2.0 y 2.1 A y AA, sin violaciones serias ni críticas), el scroll horizontal con `e2e/admin/mobile.spec.ts` (`scrollWidth <= innerWidth` a 390 × 844), los flujos con los demás E2E del admin y los estados (cargando, vacío, error, guardando, sin guardar) con los tests de pantalla de cada task (Tasks 7 a 12). Teclado y foco: foco visible de `base.css`, el foco va al `h1` al navegar (`AdminLayout.test.tsx` y `mobile.spec.ts`), Escape en los diálogos (`Dialog.test.tsx`, `ConfirmDialog.test.tsx` y `a11y.spec.ts`), el foco después de una acción que saca el botón que la hizo (archivar, borrar una línea, cambiar el estado de un pedido, quitar una pregunta o una foto: tests de cada pantalla y `a11y.spec.ts`), reordenar sin mouse (`SortableList` y las pantallas de las Tasks 10 a 12). No se recorrió cada pantalla con Tab a mano.
- **Fecha**: 2026-10-28, sobre la rama `feat/p3-checkout` (Ola 4, Task 15). Las capturas revisadas salieron del árbol de trabajo entre `79d8ab4` y `008f7cd` (los menores de la Ola 3 estaban en curso); los E2E completos se volvieron a correr sobre `008f7cd`. En la revisión final de P4 se regeneraron todas las capturas con los arreglos de la revisión y se miraron de nuevo Ingreso, Sesión vencida, Productos, Líneas, Contenido · Inicio y Ajustes; los 113 E2E del admin pasaron.

Leyenda: ✅ cumple (o la diferencia es un desvío aceptado, con su clave); ❌ desvío que hay que corregir (el número remite a "Desvíos a corregir"); — la columna no aplica o la pantalla no está en esa prueba.

## Desvíos aceptados (reglas del plan, rulings y forma de capturar)

| Clave | Desvío | Dónde se ve |
|---|---|---|
| C1 | Sin diseño exportado: "coincide" quiere decir que respeta las reglas de interfaz del plan (tema oscuro, solo tokens, `h1` 25 px, `h2` 20 px, cuerpo 15 px, labels 12 px al 70 %, campos y botones de 36 px, `max-w-6xl`, 16/32 px de relleno) y los textos de los `*.copy.ts`. | Todas |
| C2 | Captura de página completa: la barra lateral termina a los 900 px de la ventana y la barra de `FormActions` ("Descartar" y "Guardar cambios", pegada abajo) queda dibujada a la altura del borde de la ventana, encima del contenido. En el navegador las dos quedan fijas al hacer scroll: es un efecto de la captura, no de la pantalla. | Resumen, formularios largos (producto, contenido, ajustes) |
| C3 | A 390 px las pestañas de Contenido (y las de Legales) se desplazan de costado dentro de su franja, no la página: "Pie" y "Legales" quedan fuera de vista hasta deslizarlas. | Contenido a 390 px |
| C4 | A 390 px las tablas esconden las columnas secundarias (`meta.hideBelow`: línea, cliente, pago, envío) y lo que no entra se desplaza dentro de su tarjeta. | Productos, Pedidos |
| C5 | Modo de prueba: insignia "Modo de prueba" en la barra lateral y en la superior, y el aviso del Resumen. En vivo no aparecen. | Todas, Resumen |
| C6 | Datos de demostración: el segundo socio de Nosotros es "Nombre del socio" (contenido sembrado de la tienda hasta tener el nombre real) y las fechas de los pedidos son relativas al momento de abrir el admin. | Nosotros, Pedidos |
| C7 | Una ruta que no existe en la raíz (`/no-existe`) muestra el 404 sin la barra lateral: la raíz no sabe si hay sesión. "Volver al inicio" lleva al Resumen. El `h1` es oculto y el título visible es el del `EmptyState`. | 404 |
| C8 | Ruling P4-13: guardar cambios de un producto archivado lo pasa a borrador, con el aviso bajo "Estado" y el toast. Ruling P4-14: en el diálogo de `product_changed`, Escape cierra y conserva lo escrito; "Ver la versión guardada" descarta. | Producto |
| C9 | El Resumen titula sus tarjetas con `h3` bajo dos `h2` ocultos ("Ventas" y "Para atender") para no saltar niveles; las reseñas usan `h2` con el nombre del producto. | Resumen, Reseñas |

## Pantallas

Cada fila se revisó con sus dos capturas (`admin-{captura}-1440.png` y `admin-{captura}-390.png`).

| Pantalla (captura) | Estructura | Textos | Colores y tipografía | Estados | Teclado y foco | Accesibilidad (axe) | 390 px |
|---|---|---|---|---|---|---|---|
| Ingreso (`login`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Resumen (`dashboard`) | ✅ C2 C9 | ✅ C5 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Productos (`products`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (C4) |
| Producto nuevo (`product-new`) | ✅ C2 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Producto con fotos (`product-photos`) | ✅ C2 | ✅ | ✅ | ✅ C8 | ✅ | ✅ | ✅ |
| Líneas y su diálogo (`categories`, `categories-dialog`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅, también con el diálogo abierto | ✅ |
| Pedidos (`orders`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ C4 |
| Pedido y el despacho (`order`, `order-ship`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅, también con el diálogo de despacho abierto | ❌ 6 |
| Contenido · Inicio (`content-home`) | ✅ C2 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ C3 |
| Contenido · Nosotros (`content-about`) | ✅ C2 | ✅ C6 | ✅ | ✅ | ✅ | ✅ | ✅ C3 |
| Contenido · Preguntas (`content-faq`) | ✅ C2 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ C3 |
| Contenido · Pestañas (`content-tabs`) | ✅ C2 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ C3 |
| Contenido · Pie (`content-footer`) | ✅ C2 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ C3 |
| Contenido · Legales (`content-legal`) | ✅ C2 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ C3 |
| Ajustes (`settings`) | ✅ C2 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reseñas (`reviews`) | ✅ C9 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mensajes (`messages`) | ✅ | ✅ | ❌ 6 | ❌ 7 | ✅ | ✅ | ❌ 6 |
| Mi cuenta (`account`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 404 (`not-found`) | ✅ C7 | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| Sesión vencida (`session-expired`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Menú del celular (`menu-390`, solo 390) | ✅ | ✅ | ✅ | — | ✅ | — | ✅ |
| Enlace a Mercado Pago verificado con la cuenta real | Pendiente hasta producción: el enlace "Ver en Mercado Pago" del pedido usa la dirección "a confirmar" (decisión Q4) y hay que probarlo con la cuenta real de Galpón | | | | | | |

## Desvíos a corregir

Los desvíos 1 a 3 se corrigieron en la revisión de la Ola 4 y el 4 en la revisión final de P4; el 5 no se reproduce. Quedan abiertos el 6 y el 7, para P5.

1. **Corregido.** Los enlaces del menú con contador no cumplían "nombre que incluye lo visible" (WCAG 2.5.3, axe `label-content-name-mismatch`): se veían como "Pedidos3". `AdminSidebar.tsx` pone ahora un espacio entre el nombre y el `Badge`, y `a11y.spec.ts` volvió a revisar toda la página con `seriousViolations`.
2. **Corregido.** Productos tenía 112 px de scroll horizontal a 390 px: el encabezado oculto (`sr-only`, posición absoluta) de la columna de acciones se escapaba del `overflow-x-auto`. `DataTable.tsx` lleva ahora `relative` en el contenedor con scroll, y `mobile.spec.ts` ya no marca ninguna pantalla como desvío.
3. **Corregido.** Al cerrar un `Dialog` el foco quedaba en el `body` (el kit abre los diálogos con `open` controlado, sin `Trigger`), y lo mismo con un `ConfirmDialog` abierto desde `ActionsMenu`. `Dialog` y `ConfirmDialog` comparten ahora `use-restore-focus.ts` (recuerdan quién tenía el foco al abrirse y vuelven a él si quedó en el `body`), y `ActionsMenu` pasa el foco a su disparador antes de ejecutar la acción elegida, porque el ítem desaparece al cerrarse el menú. `a11y.spec.ts` ya no marca el caso con `test.fail` y suma el de "Archivar".
4. **Corregido en la revisión final.** `LoginForm.tsx` usa ahora `Field`, `TextInput` y `Button` (con "Ingresando…" y `Spinner`), con los mismos textos (pasaron a `auth.copy.ts`), y el `h1` del ingreso lleva `text-h3`. Antes, el ingreso y el diálogo "Tu sesión venció" no usaban el kit: labels de 15 px en `neutral-300` (la regla dice 12 px al 70 %), campos de 15 px y un botón propio (sin `min-h-9` ni `Spinner`). Capturas `admin-login-*` y `admin-session-expired-*` regeneradas y revisadas.
5. **No se reproduce (revisión final de P4).** Solo la raíz tiene `notFoundComponent` y `errorComponent` (no hay `defaultErrorComponent`): en TanStack Router el 404 global se dibuja en el `Outlet` de la raíz y un error sube al `CatchBoundary` de la raíz, que reemplaza a la estructura. En el navegador hay un solo `main` y no hay barra lateral en `/no-existe`, `/productos/abc/def`, `/pedidos/GLP-09001/x` y `/contenido/zzz` (es el C7). No se tocó `__root.tsx`. Se había anotado (revisión de la Ola 2) que el 404 y el error de ruta dentro de la estructura dejaban dos `main`, porque `NotFound` y `RouteError` dibujan el suyo; nunca se dibujan dentro de `AdminLayout`.
6. **Identificadores que se cortan en el guion.** A 390 px el título del diálogo de despacho parte el número ("Despachar el pedido GLP-" / "09001") y en Mensajes el código de arrepentimiento ("Código ARR-" / "000003"), que además no va en `font-mono` como los números de pedido. Archivos: `apps/admin/src/features/messages/components/MessageItem.tsx` (código en `font-mono` y sin corte) y `apps/admin/src/features/orders/components/ShipOrderDialog.tsx` (el número del título sin corte).
7. **"Solo sin leer" puede mostrar como no leído un mensaje recién abierto.** Si se tilda el filtro mientras se guarda el "leído" (la API simulada demora 150 a 400 ms), la lista filtrada llega antes que el guardado y, como la bandeja se invalida con `refetchType: 'none'` (decisión de la Task 9 para no esconder el mensaje que se está leyendo), no se vuelve a pedir hasta cambiar de filtro o de pantalla. El contador del menú sí queda bien. Archivo: `apps/admin/src/features/messages/use-mark-message.ts` (por ejemplo, volver a pedir las listas que no son la visible, o la visible si se pidió después de empezar a guardar). `e2e/admin/messages.spec.ts` tilda el filtro antes de abrir el mensaje.
