# Lista de control visual de P3 (checkout y resultado)

Compara el checkout de la tienda compilada con las capturas de referencia de `screens/checkout-*.png`, a 1440 px y a 390 px.

- **Cómo se generan las capturas del diseño**: `npm run design:capture -- checkout` (nuevo en P3). Abre el bundle, agrega el Mate Imperial de Calabaza desde su ficha, recorre `#/checkout` (Contacto, Envío a domicilio, Pago con Mercado Pago, la opción que el diseño trae elegida) y paga para llegar a la pantalla de gracias. Guarda `checkout-<contact|shipping|payment|result>-<1440|390>.png`, página completa.
- **Cómo se generan las de la tienda**: `npm run build && npm run test:e2e -- e2e/store/visual.spec.ts --project=store-desktop`. La prueba "captura el checkout en sus tres pasos y el resultado aprobado" hace lo mismo con el mismo producto y los mismos datos (Lucía Pérez, `lucia@ejemplo.com`, Av. Corrientes 1234, CABA): cada paso vacío al llegar, el paso 3 con Mercado Pago elegido y el resultado después de **Aprobar** en el simulador. Guarda en `test-results/visual/checkout-*.png`.
- **Cómo se comparó**: lado a lado, diseño a la izquierda y tienda a la derecha, página completa a 1440 y a 390 px. Las animaciones (aparición de cada paso, check dibujado del resultado) se miraron solo en su estado final.
- **Fecha**: 2026-10-26, sobre la rama `feat/p3-checkout` con los arreglos de la Task 8.

Leyenda: ✅ coincide (o la diferencia es un desvío aceptado); ❌ desvío que hay que revisar (el número remite a "Desvíos a corregir").

## Desvíos aceptados (spec, reglas del plan y rulings)

Aparecen en las tablas como ✅ con su nota. Las claves A vienen de `CHECKLIST-P2.md`; las B son nuevas de P3.

| Clave | Desvío | Dónde se ve |
|---|---|---|
| A1 | Barra superior fina "Botón de arrepentimiento" (D9, Disposición 954/2025): todo empieza 32 px más abajo que la captura. | Todas |
| A4 | "Precio sin impuestos nacionales" en cada línea y en el subtotal del resumen (spec 14.5, Ruling P2-4); en el paso 3 con tarjeta, las cuotas con CFT/TEA y "sin interés" solo con CFT 0 (spec 14.1). | Resumen "Tu pedido", paso 3 con tarjeta |
| A5 | Columna "Legales" en el pie. | Pie |
| A6 | Aviso de privacidad bajo el formulario de contacto (spec 14.6). | Paso 1 |
| B1 | **Ruling P3-5**: el pedido se confirma al elegir el medio de pago en el paso 3, no al tocar "Pagar". Por eso el paso 3 llega sin medio elegido (el diseño trae Mercado Pago marcado), el botón "Pagar $X…" aparece recién con el pedido confirmado y debajo de los medios se ve "Reservamos tu pedido por 30 minutos (hasta el …)". | Paso 3 |
| B2 | Aviso de arrepentimiento con su link y aceptación de Términos y Política de privacidad antes del botón "Pagar" (spec 14.1 y 14.6), en un recuadro cobre que el diseño no tiene. | Paso 3 |
| B3 | Nota del envío "Costos fijos por método; el valor final se confirma antes de pagar." en lugar de "Costos estimados. El valor final se calcula con tu código postal." (spec 14.1, paso 2: el costo es fijo por método, sale de los ajustes). | Paso 2 |
| B4 | Ícono de acceso a la cuenta en el encabezado (cuenta de cliente de P3). A 390 px el carrito es solo ícono con contador (por debajo de 410 px; es el arreglo del desvío 1, ya resuelto, para que "Menú" entre entero desde 320 px). El diseño muestra "Carrito" con texto a 390 px: esa diferencia queda pendiente de validar con Lucas. | Encabezado |
| B5 | Resultado aprobado con el detalle completo del pedido (componente `OrderSummary`, el mismo del seguimiento): opciones y precio unitario de cada línea, subtotal, envío con su plazo, fila "Pago" y total; el diseño lo resume en tres filas. La ayuda va en una línea aparte, "Si hay algún problema, escribinos desde Contacto", con link, en lugar del email dentro del párrafo (spec 14.2: "líneas, envío, medio y total"). | Resultado |
| B6 | Datos distintos porque salen del pedido real: número `GLP-1000x` (el diseño inventa uno al azar) y la hora de la reserva. | Paso 3, resultado |

## Pantallas con referencia

| Pantalla | Estructura | Textos | Colores | Tipografía | Espacios | Estados | Animaciones |
|---|---|---|---|---|---|---|---|
| Paso 1, Contacto (`checkout-contact`) 1440 | ✅ A1 B4 | ✅ A6 | ✅ | ✅ | ✅ A1 | ✅ | ✅ |
| Paso 1, Contacto (`checkout-contact`) 390 | ✅ A1 B4 | ✅ A6 | ✅ | ✅ | ✅ A1 | ✅ | ✅ |
| Paso 2, Envío (`checkout-shipping`) 1440 | ✅ A1 B4 | ✅ B3 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Paso 2, Envío (`checkout-shipping`) 390 | ✅ A1 B4 | ✅ B3 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Paso 3, Pago con Mercado Pago (`checkout-payment`) 1440 | ❌ 3 (B1 B2) | ✅ B1 B2 | ✅ | ✅ | ✅ | ✅ B1 | ✅ |
| Paso 3, Pago con Mercado Pago (`checkout-payment`) 390 | ❌ 3 (B1 B2 B4) | ✅ B1 B2 | ✅ | ✅ | ✅ | ✅ B1 | ✅ |
| Resumen "Tu pedido" (en los tres pasos) | ✅ | ❌ 2 (A4) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Resultado aprobado (`checkout-result`) 1440 | ✅ B5 | ✅ B5 B6 | ✅ | ❌ 4 | ✅ | ✅ | ✅ |
| Resultado aprobado (`checkout-result`) 390 | ✅ B4 B5 | ✅ B5 B6 | ✅ | ❌ 4 | ✅ | ✅ | ✅ |
| Pie (en todas) | ✅ A5 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Pantallas sin referencia (el diseño no las tiene)

Se revisaron por coherencia con el resto de la tienda y con axe (`checkout-a11y.spec.ts` y `account.spec.ts`: sin violaciones serias ni críticas).

| Pantalla | Estado |
|---|---|
| Paso 3 con tarjeta (campos simulados, vista previa de la tarjeta, cuotas) | ✅ A4 |
| Diálogo 3-D Secure "Verificá tu compra con tu banco" | ✅ |
| Resultado pendiente, rechazado, "No completaste el pago", "El pedido venció" y "No encontramos ese pedido" | ✅ (recorridos por `checkout.spec.ts`) |
| Simulador de Mercado Pago (`/checkout/mp-simulado`) | ✅ tras el arreglo de contraste de la Task 8 (ver abajo) |
| Cuenta: ingresar, registro, resumen, direcciones, pedidos | ✅ |

## Desvíos a corregir

1. **Encabezado por debajo de 386 px: el botón "Menú" se cortaba. Resuelto en el fix de la ola de la Task 8.** Por debajo de 410 px el carrito queda solo con el ícono y el contador sobre su esquina (`features/cart/CartButton.tsx`, el nombre accesible no cambia): la fila mide 274 px más el relleno y "Menú" entra entero desde 320 px; desde 410 px sigue el botón "Carrito" con su texto. `visual.spec.ts` verifica a 320, 360, 375 y 390 px que el menú queda dentro de la ventana, a la derecha del carrito y sin desborde horizontal. El diseño no define el celular angosto: es una decisión de diseño menor, y si Lucas prefiere llevar el acceso a la cuenta al menú del celular, se revierte cambiando solo esos dos archivos.
2. **Fila del envío en el resumen. Resuelto en `fix(store): pulidos pendientes de P2 y P3`.** El diseño dice el método ("Envío a domicilio $6.500"); la tienda decía "Envío" (`CheckoutSummary.tsx`). Ahora, en los pasos 2 y 3, la fila lleva la etiqueta de la opción elegida (la misma de la tarjeta del paso 2, `ShippingOption.label`); en el paso 1 sigue "Envío · Se calcula en el paso 2".
3. **Línea "Pago procesado por Mercado Pago. No guardamos los datos de tu tarjeta." Resuelto en `fix(store): pulidos pendientes de P2 y P3`.** En el diseño va entre la nota de Mercado Pago y los botones; en la tienda iba al final del paso, debajo de "Volver" y "Pagar". Ahora va justo antes de los botones (`StepActions`) en las ramas de Mercado Pago y tarjeta, y también en las demás del paso 3 (sin medio elegido, confirmando el pedido o con un aviso), como en el diseño, donde se ve siempre.
4. **Número de pedido del resultado sin negrita. Resuelto en `fix(store): pulidos pendientes de P2 y P3`.** El diseño lo marca ("Tu pedido **GLP-68344** está confirmado"); la tienda lo armaba como texto plano. Ahora `RESULT_COPY.approved.text(email)` devuelve el texto de antes y de después del número, y `result/OrderResult.tsx` pone el número en un `<strong>`.

## Arreglos hechos en la Task 8

- **Botón "Menú" fuera de la pantalla a 390 px.** El acceso a la cuenta (B4) sumó 42 px a la fila del encabezado, que pasó a medir 432 px: de 360 a 431 px el botón "Menú" se dibujaba en `x = 396` y el `overflow` lo cortaba (a 412 px, el ancho del Pixel 7, se veían 15 px; los E2E del celular lo tocaban igual porque Playwright hace clic en la parte visible). Lo delató el E2E "captura el menú abierto del celular a 390 px", que no podía tocarlo. Ahora, por debajo de 1040 px (con la navegación oculta), la grilla no deja los dos huecos de 20 px de la columna central y los íconos van a 4 px en lugar de 6 (`Header.tsx`). La prueba verifica además que el botón entra entero en la ventana.
- **Botón "Menú" todavía cortado por debajo de 386 px (fix de la ola).** Ver el desvío 1: el carrito pasa a ícono con contador bajo 410 px y la prueba de `visual.spec.ts` se extendió a 320, 360, 375 y 390 px.
- **Contraste del simulador de Mercado Pago.** axe encontró 5 violaciones serias: el texto blanco sobre el celeste `#009ee3` (3:1) y los botones de la tienda, pensados para el fondo oscuro, sobre la tarjeta blanca (el texto crema de "Dejar pendiente" y "Rechazar" daba 1,17:1). Ahora el encabezado usa el azul oscuro de la marca (`#0070b3`, 5,3:1) y la tarjeta redefine `--color-foreground` y `--color-accent` para que los botones se lean sobre blanco (`result/MercadoPagoSimulator.tsx`).
- **3-D Secure en el checkout.** Al tocar "Confirmar" en el simulador, el diálogo del checkout se cierra solo y va al resultado (escucha el aviso `galpon:challenge-done`, igual que `/checkout/resultado`); antes había que tocar "Ya terminé" aunque el simulador dijera "Ya podés cerrar esta ventana".

## Otras observaciones

- Las capturas del diseño y de la tienda usan el mismo producto (Mate Imperial de Calabaza, sin foto en los dos), así que la miniatura del resumen es el placeholder en ambos.
- La regla de cabeceras de `/checkout/mp-simulado` (`frame-src 'self'` y `frame-ancestors 'self'` solo en esa ruta) queda probada por el E2E del 3-D Secure: el simulador se abre dentro del diálogo y el fixture `cspGuard` no registra violaciones.
- En el servidor (`next start`) aparece en el log `Route "/cuenta…": Next.js encountered the unstable value Math.random() while prerendering` al abrir `/cuenta`, `/cuenta/direcciones` y `/cuenta/pedidos`. Las páginas responden bien (los E2E de la cuenta pasan), pero conviene revisarlo: según la pila, la llamada sale del `GET` de la API simulada que consulta el servidor al armar esas páginas.
