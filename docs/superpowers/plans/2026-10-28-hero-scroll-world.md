# Hero scroll-world: adentro del mate

> Pedido de Lucas (2026-10-28): una sección introductoria nueva para el hero, hecha con Higgsfield, que sirva de fondo del inicio: al hacer scroll la cámara hace zoom al mate y adentro, con la yerba, hay gente armando y cebando un mate y pasándolo. Breve: 4 o 5 paradas a partir del hero, y recién después los productos y todo lo demás. Navegación "dentro del mate", de cerca.

**Goal:** reemplazar la capa de foto del hero y del paseo por **un video pre-renderizado que el scroll frota** (`currentTime` según el avance), como el "scroll world" de Arko: una sola toma continua de 4 tramos de 5 s (20 s) que empieza con el mate en la mesa, entra por la boca hasta la yerba, muestra manos armando y cebando y termina con el mate pasando de mano en mano; al salir del último tramo sigue la página de siempre (colección, destacados, manifiesto, cifras, kit, reseñas). Las 6 paradas del paseo del mate se reducen a **4 paradas** con el texto de las escenas actuales encima del video.

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
