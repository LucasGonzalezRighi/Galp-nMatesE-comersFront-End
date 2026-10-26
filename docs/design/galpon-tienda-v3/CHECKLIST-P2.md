# Lista de control visual de P2 (tienda pública)

Compara cada pantalla de la tienda compilada con las capturas de referencia de `screens/`, a 1440 px y a 390 px.

- **Cómo se generan las capturas**: `npm run build && npm run test:e2e -- e2e/store/visual.spec.ts --project=store-desktop`. Guarda en `test-results/visual/<pantalla>-<1440|390>.png` (página completa; el carrito, el buscador y el menú, lo que se ve en la ventana). Playwright vacía `test-results/` al empezar cada corrida.
- **Cómo se comparó**: lado a lado, diseño a la izquierda y tienda a la derecha, en tramos de la página, más recortes ampliados de los casos dudosos. Las animaciones se verificaron por E2E (`reduced-motion.spec.ts`: con `prefers-reduced-motion` todo queda visible y nada tapa la página) y no cuadro por cuadro.
- **Fecha**: 2026-10-26. Las capturas se rehicieron con el árbol de la Task 11b (commit 78db310).

Leyenda: ✅ coincide (o la diferencia es un desvío aceptado); ❌ desvío que hay que revisar (el número remite a "Desvíos a corregir").

## Desvíos aceptados (spec y reglas del plan)

Aparecen en las tablas como ✅ con su nota.

| Clave | Desvío | Dónde se ve |
|---|---|---|
| A1 | Barra superior fina "Botón de arrepentimiento" (D9, Disposición 954/2025): todas las páginas empiezan 32 px más abajo que la captura. | Todas |
| A2 | Inicio sin mate 3D (P2): en su lugar va la foto del producto. En el celular la foto queda detrás del título. | Inicio |
| A3 | Rutas reales (`/producto/mate-imperial-premium`, `/tienda/bombillones`) en lugar de los hashes del diseño. | Todas |
| A4 | Precio sin impuestos nacionales, cuotas con CFT/TEA ("o 3 cuotas sin interés de $13.333 · CFT 0,00 % (TEA 0,00 %)") en lugar de "3 cuotas de $13.333". | Tarjetas, ficha, carrito |
| A5 | Cuarta garantía "Arrepentimiento" en la ficha y columna "Legales" en el pie. Además, la tercera garantía dice "Cambios / 10 días, sin uso" en lugar de "10 días / Para cambios" del diseño: el spec 14.6 pide Cambios y Arrepentimiento por separado. | Ficha, pie |
| A6 | Aviso de privacidad bajo los formularios (spec 14.6). | Contacto, arrepentimiento, reseñas |
| A7 | Datos distintos porque salen del catálogo de prueba: 14 mates en el kit (el diseño decía 16), reseñas en otro orden, resultados de búsqueda en otro orden, total del kit y del carrito según las piezas elegidas. Las opciones de mate del kit van en el orden del catálogo (primero los destacados, después el resto) y no agrupadas por línea como en el diseño. | Kit, inicio, búsqueda, carrito |
| A8 | "Cómo trabajamos" a 390 px: en el diseño la descripción queda apretada en una columna de ~20 px (error de la captura); la tienda la apila bajo el título, así que la página es más corta. | Nosotros 390 |
| A9 | Las palabras del texto que se ilumina con el scroll (manifiesto de Inicio, frase de Nosotros) salen apagadas en la captura completa porque la tienda no las fuerza a encendidas; es un efecto del scroll, no de la maquetación. | Inicio, Nosotros |

## Pantallas con referencia

| Pantalla | Estructura | Textos | Colores | Tipografía | Espacios | Estados | Animaciones |
|---|---|---|---|---|---|---|---|
| Inicio (`home`) 1440 y 390 | ✅ A1 A2 | ✅ | ✅ | ✅ | ✅ A1 | ✅ A9 | ✅ |
| Tienda (`shop`) 1440 y 390 | ✅ | ✅ A4 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Línea (`shop-bombillones`) 1440 y 390 | ✅ | ✅ A4 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Producto (`product-imperial-premium`, `product-galleta`) 1440 y 390 | ✅ A5 | ✅ A4 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Armá tu kit (`kit`) 1440 y 390 | ✅ | ✅ A7 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Nosotros (`about`) 1440 y 390 | ✅ A8 | ✅ | ✅ | ✅ | ✅ | ✅ A9 | ✅ |
| Preguntas frecuentes (`faq`) 1440 y 390 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contacto (`contact`) 1440 y 390 | ✅ A6 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Carrito abierto (`cart`) 1440 y 390 | ✅ | ✅ A4 A7 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Buscador abierto y con resultados (`search`, `search-results`) 1440 y 390 | ✅ | ✅ A7 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Menú del celular (`menu`) 390 | ✅ A1 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cabecera y pie (en todas) | ✅ A1 A5 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Pantallas sin referencia (el diseño no las tiene)

Se revisaron solo por coherencia con el resto de la tienda.

| Pantalla | Estructura | Textos | Colores | Tipografía | Espacios | Estados | Animaciones |
|---|---|---|---|---|---|---|---|
| Arrepentimiento (`withdrawal`) 1440 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Arrepentimiento (`withdrawal`) 390 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Términos (`terms`) y Privacidad (`privacy`) 1440 y 390 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Desvíos a corregir

Ninguno abierto.

## Desvíos corregidos en la ola de la revisión (2026-10-26)

2. **Botón "Agregar kit al carrito" del resumen del kit.** Ahora ocupa todo el ancho de la tarjeta (1440 y 390 px). Causa: el imán (`Magnetic`) se estiraba pero su contenido seguía midiendo lo que su texto; el imán tiene la opción `fullWidth`. Lo cubre un E2E (`cart.spec.ts`) que compara el ancho del botón con el interior de la tarjeta.
4. **Título de Arrepentimiento a 1440 px.** Se bajó el tope del título a `clamp(36px, 4.4vw, 64px)`: ya no se corta "arrepentimiento" en ningún ancho de 360 a 1920 px. Lo cubre un E2E (`withdrawal.spec.ts`) que falla si algún elemento del título desborda su caja.
5. **Botón "Carrito 0" del encabezado.** El nombre accesible ahora contiene el texto visible ("Abrir carrito, 0 productos", también con el carrito vacío) y un espacio separa "Carrito" del contador en el DOM. Se quitó la excepción de `a11y.spec.ts`: axe no encuentra violaciones serias en ninguna pantalla.

## Desvíos corregidos en la Task 11b (2026-10-26)

1. **Placeholder de producto sin foto.** Ahora es el del diseño: marco con borde punteado, ícono de imagen de 22 px y texto chico debajo, sobre el fondo del contenedor (el `bg-background` de la tarjeta, el `bg-surface` de la galería). El texto sale del diseño: el nombre del producto en las tarjetas (inicio, tienda, "Más para la ronda") y en las opciones del kit, "Foto 1 · {nombre}" en la galería de la ficha, "Foto · {línea}" en las líneas del inicio y el nombre del paso ("Bombilla", "Yerba") en el bloque del kit del inicio; el carrito solo lleva el ícono. La silueta del mate se retiró: ningún otro componente la usaba. En el diseño las tarjetas no llevan el prefijo "Foto ·". Lo cubren `ImageWithPlaceholder.test.tsx`, `ProductCard.test.tsx`, `ProductDetailView.test.tsx` y `home-page.test.tsx`.
3. **Estrellas de la valoración.** Ahora son enteras, con la regla del diseño (`dc-script.js`, `stars`): la estrella `i` se llena si el promedio es de `i - 0,25` o más, así que 4,7 dibuja cuatro llenas y una vacía. El `aria-label` sigue siendo exacto ("4,7 de 5"). Lo cubre `Stars.test.tsx`.

## Otras observaciones

- `/producto/<slug-inexistente>` y `/tienda/<línea-inexistente>` responden 404 con `noindex`, pero en la primera petición con el caché frío un navegador puede recibir 200 (la página igual muestra "No encontramos…" y lleva `noindex`). Es comportamiento de Cache Components; conviene revisarlo con el backend real.
- El enlace "Finalizar compra" apunta a `/checkout`, que es de P3: hoy responde 404.
