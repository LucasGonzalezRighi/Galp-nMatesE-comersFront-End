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

## Próximos pasos: P2 a P5

Una **sesión de trabajo** es una tanda de entre 1 y 3 horas seguidas, como las tres de P1, con agentes en paralelo y el proceso liviano. P1 llevó 3 sesiones más una de cierre (pulido, documentación, E2E y revisión final). Las estimaciones son un rango y **no incluyen el tiempo de Lucas** para revisar capturas, probar y decidir.

| Plan                       | Qué incluye                                                                                                                                                                            | Estimación     | Listo cuando                                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **P2 · Tienda pública**    | Layout, componentes base, Inicio (sin 3D), Tienda, Producto, Reseñas, Búsqueda, Carrito, Kit, Nosotros, Preguntas, Contacto, Arrepentimiento, Legales, SEO y animaciones de la etapa 1 | 6 a 8 sesiones | La lista de control visual de esas pantallas aprobada, y E2E de navegación, carrito, kit, búsqueda, contacto y arrepentimiento |
| **P3 · Checkout y cuenta** | Checkout de 3 pasos, cotización, pedidos, simulador de Mercado Pago, tarjeta con Secure Fields y campos simulados, 3-D Secure, resultado, pedido de invitado y cuenta del cliente      | 4 a 5 sesiones | E2E de todos los caminos de compra en verde                                                                                    |
| **P4 · Dashboard**         | Sesión, resumen, productos con fotos, líneas, pedidos, contenido, ajustes, reseñas y mensajes                                                                                          | 5 a 6 sesiones | E2E del admin en verde y su lista de control                                                                                   |
| **P5 · Etapa 2 y cierre**  | Escena 3D, cursor y brillo, Lighthouse, accesibilidad, revisión visual final y README finales                                                                                          | 3 a 4 sesiones | Objetivos de rendimiento y accesibilidad cumplidos                                                                             |

Total del front: **18 a 23 sesiones**. Por qué P2 es el más largo: tiene más pantallas que cualquier otro plan y cada una pasa por la lista de control visual contra el diseño. Lo que más puede estirar las estimaciones: ajustes de diseño al ver las pantallas reales, el 3D en celulares viejos y los hallazgos de la prueba real con Mercado Pago.

**Fase 2 (backend)**: tiene su propio diseño y su propio plan, en una conversación y un repo aparte (NestJS, PostgreSQL, Redis). Su estimación se hace cuando se escriba ese plan. Para salir a producción hacen falta las dos cosas: el front completo y el back, que se conectan cambiando variables de entorno.

**Lo que depende de Lucas**: subir los repos a GitHub (y mirar que el CI quede en verde), cuentas de prueba de Mercado Pago y de Cloudinary, las fotos reales de los productos, el nombre del segundo socio y los datos de contacto, y los profesionales para los textos legales y la condición fiscal.
