# Bitácora del frontend

Qué se hizo, cuándo, qué decisiones cambiaron por el camino y qué sigue. Se actualiza al cerrar cada plan (P1 a P5). Las decisiones de fondo están en los [ADRs](adr/README.md); el diseño completo, en el [spec del front](superpowers/specs/2026-10-19-galpon-frontend-design.md).

## P1 · Fundaciones y contrato (2026-10-19 a 2026-10-21)

**Estado**: cerrada tras la revisión final.

### Qué se construyó

| Pieza                    | Qué quedó                                                                                                                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace                | npm workspaces, versiones exactas centralizadas y chequeadas por `npm run lint`, ESLint 9 con límites entre paquetes, Prettier, lefthook, `.editorconfig`, `.nvmrc`                                                                    |
| `domain`                 | Reglas de negocio puras: dinero, catálogo y búsqueda, carrito, kit, totales, envío, cuotas, impuestos, reseñas, fechas y estados de pedido. Exige 100 % de cobertura                                                                   |
| `schemas`                | Validaciones Zod compartidas con mensajes en español (checkout, reseñas, contacto, arrepentimiento, cuenta, formularios del admin). Exige 100 % de cobertura                                                                           |
| `design-tokens`          | Tema de Tailwind v4 y estilos base del diseño                                                                                                                                                                                          |
| Contrato de la API       | `docs/api/openapi.yaml` con 75 operaciones (tienda, cuenta, admin), validado con Redocly sin avisos                                                                                                                                    |
| `api-client`             | Tipos generados del contrato, cliente tipado, errores, servicios, hooks de TanStack Query y el modo de prueba (6 líneas, 27 productos, router y handlers de todo P1)                                                                   |
| `apps/store`             | Esqueleto de Next.js 16 con Cache Components, CSP y revalidación por etiqueta, conectado al modo de prueba                                                                                                                             |
| `apps/admin`             | Esqueleto de Vite con login, sesión simulada que sobrevive a las recargas y CSP estricta                                                                                                                                               |
| Documentación            | README raíz, un README por app y paquete, siete ADRs, specs del front y del back, esta bitácora                                                                                                                                        |
| Pruebas y automatización | Más de 1.400 pruebas unitarias y de componentes, 13 E2E de humo con Playwright (tienda en escritorio y celular, acceso al dashboard, guardia de CSP) y el workflow de CI con verificaciones y E2E (se corre cuando Lucas suba el repo) |

### Cuándo

Primer commit del front: 2026-10-20 13:18. Último commit de este tramo, los ajustes de documentación al cerrar P1: 2026-10-21 11:48. En el medio hubo dos pausas largas por el límite de uso de la sesión de trabajo, que cortó la Task 6 y la Task 13.

| Cuándo                       | Qué pasó                                                                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| 2026-10-19                   | Diseño del front con Lucas (spec) a partir del diseño "Galpon Tienda v3" exportado de claude.ai/design    |
| 2026-10-20, hasta las 17:53  | Revisión adversarial del spec (4 enfoques), repos separados y plan de P1 (17 tareas)                      |
| 2026-10-20, 18:05 a 19:36    | Pasaje a npm; Tasks 1 a 5: workspace, `domain` y `schemas` del checkout                                   |
| 2026-10-20, 23:12 a 23:41    | Pasaje del back a NestJS y su diseño; Tasks 6 a 8: `schemas`, `design-tokens` y la base del contrato      |
| 2026-10-21, 00:03 a 00:42    | Tasks 9 a 12: contrato completo, tipos generados, cliente, fixtures y base simulada                       |
| 2026-10-21, 10:33 a 10:57    | Tasks 13 a 15: API simulada completa y las dos apps (la tienda y el admin, en paralelo)                   |
| 2026-10-21, mañana y después | Pulido de paquetes y de apps y documentación (en paralelo), E2E y CI, y la revisión final de toda la rama |

De los commits salen unas **3,5 horas** de trabajo activo en tres tandas (18:05 a 19:36, 23:12 a 00:42 y 10:33 a 10:57), sin contar la preparación de cada tanda. En esas tandas se resolvieron 15 de las 17 tareas; el resto fue pulido, documentación, E2E y revisión.

### Decisiones que cambiaron

| Decisión                           | Antes → ahora                                                                                    | Por qué                                                                                                                                                                                                                                                                  | Costo                                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gestor de paquetes (2026-10-20)    | pnpm → **npm workspaces**                                                                        | Lucas quiere instalar con `npm i` y levantar con `npm run dev`. Los `catalog:` y `workspace:*` de pnpm rompen `npm install`                                                                                                                                              | La Task 1 se frenó a medio hacer y se rehízo. Hubo que escribir el chequeo de versiones y usar `npx` para `openapi-typescript` (ADR 0007)        |
| Backend (2026-10-20)               | Python + FastAPI → **NestJS hexagonal** con PostgreSQL + Prisma y Redis + BullMQ                 | Pedido de Lucas, que prioriza el desacople: el negocio no depende de Nest, Prisma, Mercado Pago ni Redis (sumar Stripe sería un adaptador nuevo), y el tipado entre front y back sale del contrato OpenAPI                                                               | Se reescribió el spec y se escribió el [diseño del back](superpowers/specs/2026-10-20-galpon-backend-design.md). El contrato del front no cambió |
| Cómo se revisa el trabajo          | Revisión por tarea, un lote de 3 tareas a la vez → **proceso liviano** y agentes **en paralelo** | Los dos primeros lotes costaron cerca de 1 M de tokens de subagentes por 3 tareas, y las revisiones encontraban casi solo detalles menores. Lucas pidió gastar menos                                                                                                     | Un defecto puede llegar a la revisión final de la rama, que sigue prevista. Los detalles menores se juntan en tareas de pulido                   |
| Contrato de la API                 | Forma pensada en el spec → forma probada al escribir el YAML                                     | Contenido por rutas separadas (tipos exactos), slug viejo con `200` y redirección 308 en la tienda, `ProductTabs.descriptionNote`, login del admin que devuelve `csrfToken`, y `ShippingAddress` como unión (a sucursal solo se piden código postal, ciudad y provincia) | Se ajustó el spec en este cierre (Task 17)                                                                                                       |
| Avisos de seguridad de `npm audit` | Sin tratar → `handlebars` forzado a 4.7.10 y 6 avisos altos de `braces` documentados             | Los críticos venían de una dependencia de lint; los altos no tienen arreglo y solo afectan herramientas de desarrollo                                                                                                                                                    | Hay avisos visibles en `npm install` hasta que haya versión corregida (README y ADR 0007)                                                        |

El proceso liviano, en números: lote 1 y 2, cerca de 1 M de tokens por 3 tareas; lote 3 (liviano), 4 agentes y unos 760 mil tokens por 3 tareas; Tasks 14 y 15 en paralelo, 3 agentes, unos 609 mil tokens y unos 20 minutos de reloj.

### Lecciones: qué haríamos distinto

1. **Cerrar las decisiones de herramientas antes de escribir el plan.** El gestor de paquetes y el stack del back se cambiaron con el plan ya escrito y una tarea en marcha. Una pregunta de cinco minutos al empezar (¿`npm i` o pnpm?, ¿qué lenguaje para el back?) habría evitado rehacer la Task 1 y reescribir spec y plan.
2. **Empezar con el proceso liviano.** Revisar cada tarea con varios agentes dio poco para su costo. Alcanza con un agente por tarea, una revisión por lote (solo lo grave) y un pulido al final.
3. **Tareas más chicas o con puntos de control.** La Task 13 se cortó por el límite de uso después de escribir las pruebas y antes de la implementación. Hacer commit del paso en rojo y partir las tareas grandes evita perder trabajo.
4. **Preparar el terreno antes de paralelizar.** Las Tasks 14 y 15 salieron bien en paralelo porque antes se hizo un commit con los `package.json`, la configuración de Vitest y el `npm install` de las dos apps, y porque trabajaron en carpetas distintas. Conviene repetirlo en cada plan.
5. **Anotar los detalles menores en un solo lugar y pulirlos en bloque.** Funcionó, pero la lista creció; mejor planear una tarea de pulido por lote desde el principio.
6. **Escribir el contrato antes que el mock fue la decisión correcta**: los tipos generados y `contract-alignment` marcaron cada desalineación. Lo que faltó fue derivar de ahí los ejemplos del plan (el caso de la dirección del envío a sucursal salió de una inconsistencia del plan).
7. **Actualizar el spec en el mismo cambio que la decisión.** Los refinamientos del contrato quedaron en el plan y se pasaron al spec recién al cerrar P1.

### Pendientes que quedaron anotados

- **P3**: el middleware del token del pedido (`getOrderToken`) o ajustar lo que dice el contrato sobre cómo se envía.
- **P4**: la escena "pieces" del inicio tiene fijo el `-10%`; tiene que usar el descuento editable del kit (`kitDiscountPercent`).
- **P5**: `tokens.typography.fontFamily` contiene `var()`; para el canvas de three.js hace falta un nombre de familia simple.
- **Antes de producción**: probar a mano Mercado Pago con credenciales de prueba, revisión de los textos legales por un profesional y confirmación de la condición fiscal con el contador.

## P2 · Tienda pública (2026-10-21 a 2026-10-26)

**Estado**: cerrada tras la revisión final (`1ef9630`).

Se construyó la tienda pública sobre la API simulada: layout con la barra de arrepentimiento, componentes de interfaz y animaciones de la etapa 1, carrito, tarjeta de producto, catálogo con búsqueda y orden, ficha con reseñas, armá tu kit, buscador, inicio (sin 3D), nosotros, preguntas, contacto, arrepentimiento, legales, SEO (metadatos, `og:image`, sitemap) y los E2E de navegación, carrito, kit, búsqueda, contacto, arrepentimiento, CSP, movimiento reducido, axe y control visual. La comparación con el diseño quedó en [`CHECKLIST-P2.md`](design/galpon-tienda-v3/CHECKLIST-P2.md).

- **Cuándo**: plan el 2026-10-21 a las 18:43 y ola 0 (Tasks 1 a 4 en paralelo) esa misma tarde; Task 5 (layout y carrito) el 2026-10-23; ola 1 (Tasks 6 a 10 en paralelo), Task 11 (SEO, E2E y control visual), Task 11b y revisión final el 2026-10-26, de 14:24 a 19:19.
- **Decisiones**: el precio sin impuestos del kit y del subtotal del carrito se difirió a la cotización del back de P3 (Ruling P2-4: el dato público no existía y derivarlo era recalcular a mano). El placeholder sin foto y las estrellas enteras se rehicieron como en el diseño (Ruling P2-6, Task 11b).
- **Lecciones**: los cinco agentes de la ola 1 se cortaron a la vez por el límite de uso y se retomaron sobre su trabajo a medias; dos agentes que compartían el índice de git se pisaron el staging, y desde entonces se agrega con rutas explícitas, nunca `git add -A` (Ruling P2-5); la lista de control visual encontró dos desvíos que ninguna prueba veía.

## P3 · Checkout y cuenta (2026-10-26)

**Estado**: implementada, con todos los E2E de compra en verde; falta la revisión final de la rama (`feat/p3-checkout`).

### Qué se construyó

| Pieza                   | Qué quedó                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contrato y API simulada | Cotización del carrito con precio neto, pedidos con reserva de 30 minutos, preferencia de Mercado Pago, pago con tarjeta, cuotas, cancelación del intento, sesión de cliente con cookie, cuenta (registro, ingreso, recuperación, perfil, direcciones, pedidos) y rutas de control para los E2E                                                                                                                        |
| Carrito                 | Cotiza contra la API, muestra el precio sin impuestos en cada línea y manda el precio esperado (`expectedUnitPriceArs`) para detectar cambios                                                                                                                                                                                                                                                                          |
| Pagos                   | Formulario de tarjeta desacoplado de Mercado Pago: Secure Fields en vivo y campos simulados en modo de prueba, cuotas con CFT y diálogo 3-D Secure                                                                                                                                                                                                                                                                     |
| Checkout                | Tres pasos (Contacto, Envío, Pago) que sobreviven a una recarga, pedido al elegir el medio de pago, idempotencia, `409` con lo que cambió y "Confirmar de nuevo", avisos legales antes de "Pagar"                                                                                                                                                                                                                      |
| Resultado               | `/checkout/resultado` (aprobado, pendiente con consulta cada 5 s, rechazado con motivo, 3-D Secure, "No completaste el pago", vencido y no encontrado), simulador de Mercado Pago y seguimiento del pedido de invitado (`/pedido/{numero}`)                                                                                                                                                                            |
| Cuenta                  | `/cuenta` con la sesión protegida por `proxy.ts`: ingreso, registro, recuperación, resumen y perfil, direcciones, pedidos y su detalle; acceso desde el encabezado                                                                                                                                                                                                                                                     |
| Pruebas                 | E2E de todos los caminos de compra en escritorio y Pixel 7 (Mercado Pago aprobado, pendiente y rechazado; tarjeta `APRO`, `OTHE` y `3DS`; `409` por precio; doble clic en "Pagar"; vencimiento; recarga en el paso 2; resultado sin token; compra con cuenta), axe en checkout, resultado, simulador y cuenta, y capturas del checkout contra el diseño ([`CHECKLIST-P3.md`](design/galpon-tienda-v3/CHECKLIST-P3.md)) |

### Cuándo

Todo el 2026-10-26: plan a las 19:06 y rama desde `1ef9630`. Cuatro olas con el proceso liviano: ola 0 (contrato y API simulada, en serie: 7 agentes, 1,36 M de tokens, 69 min), ola 1 (carrito, pagos y cuenta en paralelo: 6 agentes, 1,40 M de tokens, 50 min), ola 2 (checkout y resultado en paralelo; el primer intento murió a los 95 s por el límite de uso y se relanzó igual) y ola 3 (Task 8: E2E, accesibilidad y cierre).

### Decisiones que cambiaron

| Decisión                               | Antes → ahora                                                                                                          | Por qué                                                                                                                                                                           |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cuándo se crea el pedido (Ruling P3-5) | Al tocar "Pagar" → **al elegir el medio de pago** en el paso 3                                                         | Las cuotas necesitan el total confirmado y el número del pedido, y así la reserva de 30 minutos cubre Mercado Pago y tarjeta. "Pagar" solo crea la preferencia o cobra la tarjeta |
| "El pedido venció" (Ruling P3-6)       | También sin pago o con el pago cancelado → **solo con `status: expired`**; si no, "No completaste el pago" con "Pagar" | Después de cancelar un intento el pedido sigue reservado y se puede pagar                                                                                                         |
| Precio esperado (Ruling P3-3)          | El back detectaba los cambios solo por el total → `expectedUnitPriceArs` opcional por línea                            | Un cambio de precio llega como `price_changed` con el detalle, no recién como `total_changed`                                                                                     |
| Cookie de sesión (Ruling P3-2)         | `__Host-galpon_session` → `galpon_session` en modo de prueba (nombre configurable)                                     | `http://localhost` no acepta el prefijo `__Host-`                                                                                                                                 |
| 3-D Secure en vivo (Ruling P3-7)       | Retomarlo desde el pedido → la dirección del desafío se recuerda en la pestaña que pagó                                | `Order.payment` no la trae; revisarlo con el back por si se agrega al contrato                                                                                                    |

### Lecciones: qué haríamos distinto

1. **Los E2E contra la API simulada encontraron lo que las pruebas de componentes no veían**: un "Confirmar de nuevo" que aparecía antes de que el carrito se pusiera al día (y volvía a chocar con el mismo `409`), el diálogo de 3-D Secure que no se cerraba solo y el contraste del simulador. Conviene escribir los E2E de un flujo junto con el flujo, no al final.
2. **La emulación del celular esconde desbordes.** Con el acceso a la cuenta, el botón "Menú" quedó fuera de la pantalla a 390 px y los E2E del Pixel 7 no lo vieron (Playwright toca la parte visible). Lo delataron la captura del menú a 390 px y la comparación visual, y se arregló en la Task 8; ahora una prueba verifica que el botón entra entero en la ventana.
3. **Una base simulada compartida entre pruebas paralelas pide aislamiento explícito**: stock de sobra antes de cada compra y un producto propio por proyecto cuando la prueba cambia precios.
4. **El límite de uso sigue cortando olas enteras.** Relanzar con los mismos argumentos funcionó porque el árbol quedó limpio; los commits por paso siguen siendo la mejor defensa.

### Pendientes que quedaron anotados

- Los desvíos abiertos de [`CHECKLIST-P3.md`](design/galpon-tienda-v3/CHECKLIST-P3.md): el botón "Menú" que todavía se corta por debajo de 386 px (viene de P2 y pide una decisión de diseño), la fila del envío del resumen, la línea "Pago procesado por Mercado Pago" y el número de pedido en negrita.
- Detalles menores juntados para la revisión final de P3: "Conectando…" que queda al volver con Atrás (bfcache), `Idempotency-Key` que solo se reutiliza ante errores de red, `clearCart()` del resultado sin comparar el `cartHash`, `cancelPayment` dos veces en "Probar con otro medio", el iframe del desafío con el layout completo y el aviso de `Math.random()` en el log de `/cuenta`.
- **Con el back**: aceptar `expectedUnitPriceArs`, sumar `challenge` a `OrderPayment` si se quiere retomar el 3-D Secure desde otra pestaña, y probar a mano Mercado Pago con credenciales de prueba.

## Próximos pasos: P4 a P5

Una **sesión de trabajo** es una tanda de entre 1 y 3 horas seguidas, como las tres de P1, con agentes en paralelo y el proceso liviano. P1 llevó 3 sesiones más una de cierre (pulido, documentación, E2E y revisión final). Las estimaciones son un rango y **no incluyen el tiempo de Lucas** para revisar capturas, probar y decidir.

| Plan                      | Qué incluye                                                                                   | Estimación     | Listo cuando                                       |
| ------------------------- | --------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------- |
| **P4 · Dashboard**        | Sesión, resumen, productos con fotos, líneas, pedidos, contenido, ajustes, reseñas y mensajes | 5 a 6 sesiones | E2E del admin en verde y su lista de control       |
| **P5 · Etapa 2 y cierre** | Escena 3D, cursor y brillo, Lighthouse, accesibilidad, revisión visual final y README finales | 3 a 4 sesiones | Objetivos de rendimiento y accesibilidad cumplidos |

P2 y P3 ya están hechas (arriba): para el front quedan **8 a 10 sesiones**. Lo que más puede estirar las estimaciones: ajustes de diseño al ver las pantallas reales, el 3D en celulares viejos y los hallazgos de la prueba real con Mercado Pago.

**Fase 2 (backend)**: tiene su propio diseño y su propio plan, en una conversación y un repo aparte (NestJS, PostgreSQL, Redis). Su estimación se hace cuando se escriba ese plan. Para salir a producción hacen falta las dos cosas: el front completo y el back, que se conectan cambiando variables de entorno.

**Lo que depende de Lucas**: subir los repos a GitHub (y mirar que el CI quede en verde), cuentas de prueba de Mercado Pago y de Cloudinary, las fotos reales de los productos, el nombre del segundo socio y los datos de contacto, y los profesionales para los textos legales y la condición fiscal.
