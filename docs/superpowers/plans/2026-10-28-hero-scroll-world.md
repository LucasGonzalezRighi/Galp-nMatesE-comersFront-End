# Hero scroll-world: adentro del mate

> Pedido de Lucas (2026-10-28): una sección introductoria nueva para el hero, hecha con Higgsfield, que sirva de fondo del inicio: al hacer scroll la cámara hace zoom al mate y adentro, con la yerba, hay gente armando y cebando un mate y pasándolo. Breve: 4 o 5 paradas a partir del hero, y recién después los productos y todo lo demás. Navegación "dentro del mate", de cerca.

**Goal:** reemplazar la capa de foto del hero y del paseo por **un video pre-renderizado que el scroll frota** (`currentTime` según el avance), como el "scroll world" de Arko: una sola toma continua de 4 tramos de 5 s (20 s) que empieza con el mate en la mesa, entra por la boca hasta la yerba, muestra manos armando y cebando y termina con el mate pasando de mano en mano; al salir del último tramo sigue la página de siempre (colección, destacados, manifiesto, cifras, kit, reseñas). Las 6 paradas del paseo del mate se reducen a **4 paradas** con el texto de las escenas actuales encima del video.

## Referencia 2: el demo de scroll-world (2026-10-29)

Lucas mandó el demo de la skill `scroll-world` (Pearl & Co., Belvedere, Meridian Motors): la página queda fija y **el scroll mueve la cámara por un mundo**: en el diorama de miniatura la cámara se zambulle en cada escena y salta en vuelo a la siguiente; en los mundos realistas es una sola toma continua. Lo que señala: "el scroll va para otro lado", la cámara viaja, no baja la página. Esto confirma el enfoque de este plan y suma el recorrido como viaje por el **mundo del mate**, no solo por el ritual:

| # | Parada | Qué se ve | Titular |
|---|---|---|---|
| 1 | El yerbal | Plantación de yerba en Misiones al amanecer, tierra colorada, un tarefero cosechando | "Empieza en el yerbal." |
| 2 | El galpón | El taller: calabazas curándose, virolas de alpaca cincelándose, cuero cosido a mano | "Hecho en el galpón." |
| 3 | El mate | El producto en macro: yerba que cae dentro del mate, la bombilla entra (keyframes k1 y k2) | "Encontrá tu mate." |
| 4 | El ritual | El cebado: agua a 75 °C, vapor, espuma (k3) | "Agua a 75 °C." |
| 5 | La ronda | El mate pasa de mano en mano; salida a la mesa con las tres piezas (k4) | "Hechos para compartir." |

Dos direcciones de arte posibles, a elegir con Lucas: **fotorrealista cálida** (como los keyframes k1 a k4 y el tema oscuro de la tienda; toma continua, arquitectura A: 5 tramos ≈ 45 cr con Kling pro + 5 cuadros ≈ 10 cr) o **diorama en miniatura** (arcilla mate, isométrico, luz cálida, como Pearl & Co.; zambullidas + saltos aéreos, arquitectura B: 5 zambullidas + 4 conectores ≈ 81 cr + cuadros). Recomendación: fotorrealista, porque coincide con las fotos reales de los productos y con el tema oscuro y cobre de la tienda; el diorama queda para una campaña aparte. Versión móvil nativa 9:16: duplica el costo; por ahora solo escritorio (el celular muestra los cuadros fijos con las escenas apiladas).

## Referencia de estilo (video de WhatsApp, 2026-10-29)

Reels de landings de comida (EMBER "Born in fire", Wilda "Fresh has a wild side", FINO): el producto en video a pantalla completa con movimiento físico (fuego, ingredientes que caen en cámara lenta, un tomate que cae en el bowl), un titular enorme por sección, fondo oscuro y una animación distinta en cada parada. Lo que pide Lucas: "impresionante, ultra calidad, dinámico y profesional". Traducción para el mate: **cada tramo tiene un gesto físico protagonista** (yerba que cae, bombilla que entra, agua que cae con vapor y espuma, el mate que pasa de mano), cámara que se mueve pero nunca retrocede, 1080p→2K con grano fino, y titulares de dos líneas por parada (`StoryTitle` ya tiene la escala).

### Prompts por tramo (Kling 3.0 Omni Frames pro, 5 s, 16:9, sin sonido)

1. **Caída de yerba (k1 → k2):** "Slow-motion cascade of loose green yerba mate leaves pouring from above into the black leather gourd, leaves tumbling and catching the warm copper key light, fine dust glinting; the camera glides forward and tilts down over the rim as two hands come in to steady and tilt the gourd and place the brass-tipped bombilla; ends matching the end frame. Continuous take, no cuts, no camera reverse, shallow depth of field, cinematic food-commercial look."
2. **Agua y vapor (k2 → k3):** "Continuous take: the hands settle the bombilla; the camera pulls back and sinks to table level while a matte black kettle enters from the right and pours a thin arc of hot water next to the bombilla; macro splash droplets and a slow bloom of steam, the yerba foams; warm copper rim light; ends matching the end frame. No cuts, no reverse."
3. **La ronda (k3 → k4):** "Continuous take: the kettle lifts away through its own steam; a hand picks up the steaming gourd and extends it across the dark walnut table into another person's open hand, the camera easing back to a medium close-up; a bag of yerba and a second bombilla rest on the table out of focus; ends matching the end frame. No cuts, no reverse."
4. **Salida (k4 → k5, mesa con las tres piezas):** "Continuous take: the receiving hand carries the gourd out of frame to the right while the camera drifts back and settles on a wide, calm tabletop with the mate, the bombilla and the yerba bag composed in the warm light, steam fading; ends matching the end frame (the product trio). No cuts, no reverse." (k5 se genera con Nano Banana Pro, 2 cr.)

**Hero en reposo (antes de hacer scroll):** la parada 0 reproduce en bucle un clip corto (k1 con yerba cayendo, 3 a 5 s, `loop muted playsinline`) como los spots de la referencia; al empezar el scroll el bucle se detiene y el frotado toma el control desde el mismo cuadro.

## Storyboard (4 tramos, toma continua, sin cortes)

| # | Parada | Cuadro inicial → final | Texto encima (escena actual) |
|---|---|---|---|
| 0 | Hero | El Mate Imperial Premium con su bombilla sobre la mesa de nogal, vapor (keyframe k1, listo) | "Encontrá tu mate." + botones |
| 1 | La calabaza | Push-in continuo hasta que la boca del mate y la yerba llenan el cuadro | `pieces` + `gourd` (cifras) |
| 2 | Armar | Desde la yerba: una mano inclina el mate, acomoda la yerba contra un lado y apoya la bombilla | `bombilla` + `yerba` (productos) |
| 3 | Cebar | La pava vierte agua junto a la bombilla, vapor, la yerba espuma | `ritual` (4 pasos, 75 °C) |
| 4 | La ronda | La mano retira el mate y lo pasa a otra mano; la cámara retrocede hasta la mesa con las tres piezas | `leather` + "Ver todos los mates" |

Cada tramo arranca con el **último cuadro real** del tramo anterior (se extrae con ffmpeg), así la costura es idéntica y la cámara nunca retrocede (arquitectura "toma continua" de la skill scroll-world). El scroll también se recorre hacia arriba, así que cada movimiento tiene que verse bien al revés.

## Modelos (costos medidos en la cuenta de Lucas, 2026-10-28)

| Uso | Modelo | Costo | Plan | Por qué |
|---|---|---|---|---|
| Keyframes (5) | **Nano Banana Pro** (`nano_banana_pro`, 16:9, 2k) | 2 cr c/u | free ✅ | Respeta la foto real del mate como referencia; k1 salió perfecto |
| Keyframes (alternativa) | GPT Image 2.5 (`gpt_image_2_5`, medium, 2k) | 1 cr c/u | **Basic** | Más barato; requiere plan Basic |
| Tramos de video (4) | **Kling 3.0 Omni Frames** (`kling_o3_flf`, 5 s) | 6,25 cr std · 9 cr pro | **Basic** | Primer y último cuadro: la costura exacta entre tramos |
| Tramos (alternativa de calidad) | MiniMax H3 (`minimax_h3`, 5 s, 2K) | 10 cr | **Basic** | Lo que usó midudev; 2K, muy estable con `start_image`/`end_image` |
| Tramos (máxima calidad) | Veo 3.1 (`veo3_1`, 8 s) | 32 cr | Basic | Solo si sobra presupuesto |

**Presupuesto del hero completo:** 5 keyframes (10 cr) + 4 tramos con Kling pro (36 cr) ≈ **46 créditos**, o ≈ 50 con MiniMax H3; con Kling std ≈ 35. El plan free (10 créditos) alcanzó para los keyframes; **toda generación de video exige el plan Basic** (`job_minimum_basic_plan_required` en Kling Omni Frames, Kling 3.0 Turbo, Seedance 2.0 Mini y Grok Lite; también en GPT Image 2.5). Costos medidos de otros modelos de video por si sirven: Seedance 2.0 22,5 cr, Happy Horse 12,5, FLUX 3 Video 30, Kling 2.6 10.

## Integración en la tienda

- `apps/store/src/features/home/StoryMate.tsx` pasa a ser la **capa de video**: un `<video>` por tramo (posters = keyframes; `preload="none"`, se cargan por cercanía) con `currentTime` = avance del tramo (`stageLayout` ya da `index` y `holdProgress`; el deslizamiento entre paradas pasa a frotar el video en vez de mover la pista). La pista de texto sigue a la izquierda, con 4 paradas.
- El hero deja de ser una sección aparte: es la parada 0 del escenario (título y botones encima del video quieto).
- Sin movimiento, en celular y por debajo de 700 px de alto: posters (keyframes) con las escenas apiladas, como hoy.
- Encodeo para frotar sin saltos (de la skill): `-g 6 -keyint_min 6 -sc_threshold 0`, 1080p, BT.709, `+faststart`; versión 9:16 para celular si se decide mostrar el video ahí.
- ffmpeg no está instalado en la máquina: hace falta para extraer el último cuadro de cada tramo y encodear (`winget install ffmpeg` o `ffmpeg-static` de npm en una carpeta de trabajo, fuera del repo).

## Pasos

1. Lucas pasa al plan Basic de Higgsfield (o carga ~50 créditos).
2. Keyframes k2 a k5 con Nano Banana Pro (k1 ya está: `scratchpad/hero-keyframes/k1-hero.png`, 2752×1536), con las fotos 10 y 24 como referencia; aprobación visual de Lucas.
3. Tramos 1 a 4 con Kling Omni Frames pro: `--start-image` = último cuadro real del anterior, `--end-image` = keyframe siguiente; revisar cada último cuadro antes de encadenar.
4. Encodeo, posters, `StoryMate` como capa de video, reducción del paseo a 4 paradas, E2E (home.spec) y lista de control.
