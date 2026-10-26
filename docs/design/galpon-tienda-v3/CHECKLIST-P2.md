# Lista de control visual de P2 (tienda pública)

Compara cada pantalla de la tienda compilada con las capturas de referencia de `screens/`, a 1440 px y a 390 px.

- **Cómo se generan las capturas**: `npm run build && npm run test:e2e -- e2e/store/visual.spec.ts --project=store-desktop`. Guarda en `test-results/visual/<pantalla>-<1440|390>.png` (página completa; el carrito, el buscador y el menú, lo que se ve en la ventana). Playwright vacía `test-results/` al empezar cada corrida.
- **Cómo se comparó**: lado a lado, diseño a la izquierda y tienda a la derecha, en tramos de la página, más recortes ampliados de los casos dudosos. Las animaciones se verificaron por E2E (`reduced-motion.spec.ts`: con `prefers-reduced-motion` todo queda visible y nada tapa la página) y no cuadro por cuadro.
- **Fecha**: 2026-10-26, sobre el commit de la Task 11.

Leyenda: ✅ coincide (o la diferencia es un desvío aceptado); ❌ desvío que hay que revisar (el número remite a "Desvíos a corregir").

## Desvíos aceptados (spec y reglas del plan)

Aparecen en las tablas como ✅ con su nota.

| Clave | Desvío | Dónde se ve |
|---|---|---|
| A1 | Barra superior fina "Botón de arrepentimiento" (D9, Disposición 954/2025): todas las páginas empiezan 32 px más abajo que la captura. | Todas |
| A2 | Inicio sin mate 3D (P2): en su lugar va la foto del producto. En el celular la foto queda detrás del título. | Inicio |
| A3 | Rutas reales (`/producto/mate-imperial-premium`, `/tienda/bombillones`) en lugar de los hashes del diseño. | Todas |
| A4 | Precio sin impuestos nacionales, cuotas con CFT/TEA ("o 3 cuotas sin interés de $13.333 · CFT 0,00 % (TEA 0,00 %)") en lugar de "3 cuotas de $13.333". | Tarjetas, ficha, carrito |
| A5 | Cuarta garantía "Arrepentimiento" en la ficha y columna "Legales" en el pie. | Ficha, pie |
| A6 | Aviso de privacidad bajo los formularios (spec 14.6). | Contacto, arrepentimiento, reseñas |
| A7 | Datos distintos porque salen del catálogo de prueba: 14 mates en el kit (el diseño decía 16), reseñas en otro orden, resultados de búsqueda en otro orden, total del kit y del carrito según las piezas elegidas. | Kit, inicio, búsqueda, carrito |
| A8 | "Cómo trabajamos" a 390 px: en el diseño la descripción queda apretada en una columna de ~20 px (error de la captura); la tienda la apila bajo el título, así que la página es más corta. | Nosotros 390 |
| A9 | Las palabras del texto que se ilumina con el scroll (manifiesto de Inicio, frase de Nosotros) salen apagadas en la captura completa porque la tienda no las fuerza a encendidas; es un efecto del scroll, no de la maquetación. | Inicio, Nosotros |

## Pantallas con referencia

| Pantalla | Estructura | Textos | Colores | Tipografía | Espacios | Estados | Animaciones |
|---|---|---|---|---|---|---|---|
| Inicio (`home`) 1440 y 390 | ✅ A1 A2 | ✅ | ✅ | ✅ | ✅ A1 | ✅ A9 | ✅ |
| Tienda (`shop`) 1440 y 390 | ✅ | ✅ A4 | ✅ | ✅ | ✅ | ❌ 1, 3 | ✅ |
| Línea (`shop-bombillones`) 1440 y 390 | ✅ | ✅ A4 | ✅ | ✅ | ✅ | ❌ 1 | ✅ |
| Producto (`product-imperial-premium`, `product-galleta`) 1440 y 390 | ✅ A5 | ✅ A4 | ✅ | ✅ | ✅ | ❌ 1, 3 | ✅ |
| Armá tu kit (`kit`) 1440 y 390 | ❌ 2 | ✅ A7 | ✅ | ✅ | ❌ 2 | ❌ 1 | ✅ |
| Nosotros (`about`) 1440 y 390 | ✅ A8 | ✅ | ✅ | ✅ | ✅ | ✅ A9 | ✅ |
| Preguntas frecuentes (`faq`) 1440 y 390 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contacto (`contact`) 1440 y 390 | ✅ A6 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Carrito abierto (`cart`) 1440 y 390 | ✅ | ✅ A4 A7 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Buscador abierto y con resultados (`search`, `search-results`) 1440 y 390 | ✅ | ✅ A7 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Menú del celular (`menu`) 390 | ✅ A1 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cabecera y pie (en todas) | ✅ A1 A5 | ✅ | ✅ | ✅ | ✅ | ❌ 5 | ✅ |

## Pantallas sin referencia (el diseño no las tiene)

Se revisaron solo por coherencia con el resto de la tienda.

| Pantalla | Estructura | Textos | Colores | Tipografía | Espacios | Estados | Animaciones |
|---|---|---|---|---|---|---|---|
| Arrepentimiento (`withdrawal`) 1440 | ❌ 4 | ✅ | ✅ | ❌ 4 | ✅ | ✅ | ✅ |
| Arrepentimiento (`withdrawal`) 390 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Términos (`terms`) y Privacidad (`privacy`) 1440 y 390 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Desvíos a corregir (para la tarea de ajuste)

No se corrigieron en la Task 11 (solo se anotan).

1. **Placeholder de producto sin foto.** El diseño dibuja una tarjeta con borde punteado, un ícono de imagen chico y el nombre del producto ("Foto · Mate Torpedo Premium"). La tienda dibuja un mate grande sin borde punteado ni nombre. Se ve en las tarjetas del inicio, de la tienda, de las líneas, de "Más para la ronda", del kit y en la galería de la ficha sin foto. Los placeholders sin foto son un desvío aceptado, pero su aspecto no es el del diseño; en cambio los de Nosotros sí coinciden. Hay que decidir si se iguala o se acepta.
2. **Botón "Agregar kit al carrito" del resumen del kit.** En el diseño ocupa todo el ancho de la tarjeta; en la tienda mide lo que su texto y queda pegado a la izquierda (1440 y 390 px). "Empezar de nuevo" queda bien.
3. **Estrellas de la valoración.** Con 4,7 el diseño muestra cuatro estrellas llenas y una vacía; la tienda muestra la quinta llena a medias. Se ve en las tarjetas y en la ficha.
4. **Título de Arrepentimiento a 1440 px.** "Botón de arrepentimiento" se corta: se lee "arrepentimien" porque la segunda línea es más ancha que su columna y la recorta (`overflow: hidden`). A 390 px se ve completo. El texto sigue en el DOM, por eso las pruebas lo ven.
5. **Botón "Carrito 0" del encabezado.** Se ve igual que el diseño, pero axe (`label-content-name-mismatch`, grave) marca que el texto visible ("Carrito" y el contador, que el DOM junta sin espacio) no es una parte literal del nombre accesible "Abrir carrito, N productos". El E2E `a11y.spec.ts` tolera solo esa regla en ese botón (`isKnownCartButtonFinding`); al corregirlo hay que quitar la excepción.

## Otras observaciones

- `/producto/<slug-inexistente>` y `/tienda/<línea-inexistente>` responden 404 con `noindex`, pero en la primera petición con el caché frío un navegador puede recibir 200 (la página igual muestra "No encontramos…" y lleva `noindex`). Es comportamiento de Cache Components; conviene revisarlo con el backend real.
- El enlace "Finalizar compra" apunta a `/checkout`, que es de P3: hoy responde 404.
