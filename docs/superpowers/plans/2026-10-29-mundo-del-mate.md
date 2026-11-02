# El mundo del mate: el motor del scroll-world en la tienda

> Continúa `2026-10-28-hero-scroll-world.md` (dirección elegida por Lucas el 2026-10-29: **fotorrealista cálida, toma continua**). Esta fase construye el motor con los cuadros fijos que ya existen; los clips de video entran después, sin tocar la estructura.

**Goal:** que el paseo del mate deje de ser una pista de paneles que se desplaza de costado y pase a ser **un mundo a pantalla completa que el scroll recorre**: una capa de imagen/video por parada que ocupa todo el escenario, con un movimiento de cámara leve sobre el cuadro fijo (hoy) o el clip frotado por el avance del scroll (cuando exista), y el texto de cada parada que entra y sale en la misma columna de la izquierda, sobre un velo. Seis paradas en el orden del relato: **el yerbal → el galpón → el mate → la bombilla → el ritual → la ronda**. Nada cambia en celular, con menos movimiento ni por debajo de 700 px de alto (escenas apiladas) ni en la portada.

**Architecture:**

- `apps/store/src/features/home/world-media.ts` (puro, con test): `WORLD_ORDER: readonly StoryStopKey[]` = `['yerba', 'gourd', 'pieces', 'bombilla', 'ritual', 'leather']` y `WORLD_MEDIA: Record<StoryStopKey, WorldMedia>` con `{ poster: '/hero/world/<key>.jpg', width: 1600, height: 893, clip: string | null }`. Hoy todos los `clip` son `null`; cuando existan, `'/hero/world/<key>.mp4'`. Comentario: `gourd` usa provisoriamente el cuadro del mate hasta que se genere el del taller. `worldStops(scenes, story)` ordena las paradas de `storyStops` según `WORLD_ORDER` (las escenas ausentes se saltan) y les suma `media`.
- `apps/store/src/features/home/StoryWorld.tsx` (client, reemplaza a `StoryMate.tsx`, que se borra con su test): la capa del mundo. Una capa absoluta `inset-0` por parada, con el poster (`<img>` `object-cover`, `decoding="async"`, `loading="lazy"` salvo la primera, `alt=""`, `aria-hidden`) y, si `clip` no es `null` y se puede usar video, un `<video muted playsInline preload="none" disablePictureInPicture>` con `poster`. Visibilidad: solo la parada actual y la siguiente durante el deslizamiento (fundido cruzado de opacidad en el 45 % final de cada tramo, con la curva de `stageLayout`; `useTransform` sobre el avance). Movimiento de cámara sobre el cuadro fijo: `scale` de 1 a 1,06 y una deriva de −1,5 vw a 1,5 vw a lo largo del tramo (`transform` solamente, `will-change: transform`). Con clip: en cada cambio del avance, `video.currentTime = localProgress × video.duration` (solo con `readyState >= 2`); carga por cercanía (`src` presente solo en la parada actual y las dos vecinas; `preload="auto"` para esas); al cargar, un `play().then(pause)` silencioso (iOS no pinta los cuadros buscados hasta reproducir una vez). Se puede usar video solo sin `prefers-reduced-motion` y sin `navigator.connection.saveData`; si no, posters.
- `StoryStage.tsx`: desaparece la pista horizontal (`trackX`). Los `StoryStop` quedan apilados en el mismo lugar (columna izquierda de 520 px), y solo el actual se ve: `opacity 1, translateY 0`; los demás `opacity 0, translateY 24px`, con transición de 500 ms en `--ease-main` (`motion-reduce` sin transición). Los `Reveal` de adentro siguen (disparan al verse). Un velo por delante de la capa del mundo y detrás del texto: `bg-linear-to-r from-background/85 via-background/45 to-transparent` hasta el 60 % del ancho, más un degradé arriba (para el header) y abajo. El raíl, el contador "0N / 06", la pista "Deslizá para recorrer" y `scrollToStop` no cambian. `stageLayout` no cambia (`index` y `holdProgress` siguen valiendo; `trackX` deja de usarse en la pista, pero se conserva para los tests existentes).
- Los paneles no actuales siguen en el DOM y enfocables: `onFocusCapture` del `ScrollStage` ya lleva la página a la parada enfocada (Tab recorre el mundo parada por parada, como hoy). Como no se ven, llevan `aria-hidden` NO (los lectores de pantalla los leen en orden); solo opacidad.
- Nombres del raíl (`home.copy.ts`): `yerba` "El yerbal", `gourd` "El galpón", `pieces` "El mate", `bombilla` "La bombilla", `ritual` "El ritual", `leather` "La ronda". Leyenda del contador igual.
- `HomeStory.tsx`: las escenas apiladas (celular, sin movimiento, servidor) pasan a usar también `WORLD_ORDER`, para que el relato sea el mismo en todos lados; la foto flotante de cada escena apilada sigue siendo la del producto (`StoryVisual`), no el poster.
- Assets: `apps/store/public/hero/world/{yerba,gourd,pieces,bombilla,ritual,leather}.jpg` (1600 px, ya generados por el controlador). Los `.mp4` llegan después con la misma convención.
- CSP de la tienda: los posters y los clips son `'self'`; nada que agregar. Verificar `media-src 'self'` en `next.config.ts` (si no existe, agregarlo).

**Tech Stack:** lo que hay (Next 16, React 19, `motion/react`, Tailwind 4, Vitest, Playwright). Sin dependencias nuevas.

## Global Constraints

- Las de `2026-10-27-paseo-del-mate.md` (dueños, verificación, puertos, accesibilidad, rendimiento). Dueño de rutas de esta fase: `apps/store/src/features/home/**`, `apps/store/public/hero/**`, `apps/store/next.config.ts` (solo `media-src`), `e2e/store/home.spec.ts`, `docs/superpowers/plans/2026-10-29-mundo-del-mate.md` (sección Estado), `docs/BITACORA.md`, `apps/store/README.md`.
- Solo `transform` y `opacity` animados, más `currentTime`; nunca un `scroll` listener crudo (el avance viene de `useScroll` del `ScrollStage`).
- Sin credenciales ni generación de video en esta fase: los clips no existen todavía; el motor tiene que funcionar completo con los posters.

## Task 1: El motor del mundo

- `world-media.ts` + `worldStops` (tests: orden, escenas ausentes, `media` por clave, `gourd` provisorio documentado).
- `StoryWorld.tsx` (tests con `// @vitest-environment jsdom`: un poster por parada con `alt=""`; la actual visible y las demás con opacidad 0; durante el deslizamiento la siguiente aparece; con `clip` y un `HTMLMediaElement` simulado (`readyState`, `duration`, `currentTime`, `play` que devuelve una promesa) el `currentTime` sigue el avance y la carga solo toca la actual y las vecinas; con menos movimiento o `saveData`, sin `<video>`).
- `StoryStage.tsx` sin pista: paneles apilados con fundido, velo, raíl (tests actualizados: el panel actual visible, los otros ocultos pero en el DOM; el raíl marca la actual; `scrollToStop`).
- Borrar `StoryMate.tsx` y su test; ajustar `StoryStage.test.tsx`, `HomeStory.test.tsx` y `home-page.test.tsx` si hace falta (el servidor sigue dibujando las apiladas).
- `home.copy.ts` con los nombres nuevos; `home.css` solo si hace falta algo que no sale con utilidades.
- E2E `e2e/store/home.spec.ts` a 1440×900: la tercera parada ahora es "El mate" (título "Tres piezas. Una ronda."); el raíl sigue con 6; `Tab` sigue trayendo la parada; sin desborde horizontal; nuevo: durante una parada la capa del mundo visible es la de esa parada (`data-world-stop` con `data-current`); a 1920×700 y 1600×750 las paradas altas siguen entrando (ya existe). Correr también `smoke`, `a11y`, `reduced-motion` y `visual` contra la tienda compilada (puerto 4000 con config temporal; hay servidores viejos en 3000, 3100, 3200, 3400, 3700, 3800 y 3900).
- Docs: sección "Estado" al final de este plan (qué quedó, qué falta: clips y el cuadro del taller), entrada en `docs/BITACORA.md` (2026-10-29, "Mundo del mate: el motor"), una línea en `apps/store/README.md` (carpeta `public/hero/world`, convención de clips).
- Captura obligatoria: con la tienda compilada, capturas a 1440×900 de las paradas 1 y 3 y de un deslizamiento (como en el paseo), guardadas en el workspace del SDD y revisadas con Read antes de cerrar.

## Review Focus

1. **El mundo se recorre sin saltos:** la parada actual y su poster coinciden siempre; durante el deslizamiento se ve el fundido y no un corte; el movimiento de cámara nunca retrocede dentro de un tramo.
2. **El texto se lee:** sobre cualquier poster, el velo deja el texto con contraste suficiente a 1440 y 1280; nada se superpone con el raíl.
3. **Teclado y lectores:** Tab recorre las seis paradas en orden y la página sigue al foco; el raíl tiene `aria-current`; axe sin hallazgos nuevos.
4. **Sin movimiento, celular, ventanas bajas:** escenas apiladas en el orden nuevo, sin posters de fondo, sin desborde horizontal.
5. **Rendimiento:** solo la primera imagen carga con prioridad; las demás `lazy`; nada de `scroll` listeners; sin `<video>` cuando no hay clip; `npm run build -w @galpon/store` sin avisos.

## Task 2: Vida sin video (después de la Task 1)

Lucas no va a comprar créditos por ahora ("hacelo sin la herramienta y hasta donde tengas"): el mundo se termina con los cuadros fijos y animación propia, sin clips. Todo con `transform` y `opacity`, ligado al avance del scroll (`useTransform` sobre el avance del `ScrollStage`), y nada de esto en celular ni con menos movimiento.

- **Entrar al mate (parada "El mate" → "La bombilla"):** en el deslizamiento, el poster de "El mate" (k1) escala de 1 a 2,2 con `transform-origin` en la boca del mate (≈ 52 % x, 36 % y) mientras se funde con el poster de "La bombilla" (k2), que arranca en escala 0,92 y llega a 1: la sensación de zambullirse dentro del mate. Para los demás deslizamientos, la deriva lateral y la escala leve de la Task 1.
- **Hojas de yerba cayendo (parada "El mate" y la portada):** `YerbaLeaves`, una capa `canvas` (o 24 a 36 `span` con `transform` en `requestAnimationFrame`) de hojas pequeñas (siluetas SVG de hoja de yerba en dos tonos verde oliva, 10 a 22 px, rotación y vaivén), que caen despacio hacia la boca del mate y se desvanecen; densidad baja (elegante, no nieve), pausa cuando la pestaña no se ve (`visibilitychange`) y cuando la parada no es la actual. Con menos movimiento, no se monta.
- **Vapor (paradas "El ritual" y "La ronda"):** dos o tres manchas difusas (`div` con `blur` y `opacity` baja, `will-change: transform`) que suben lentamente desde la boca del mate con `translateY` y `scale`, en bucle, solo en la parada actual.
- **Portada:** el `HomeHero` toma de fondo el poster k1 a pantalla completa (velo oscuro a la izquierda como en el mundo, el título y los botones como hoy, la foto flotante del producto se quita) con las hojas cayendo y el vapor; es la "parada 0" visual, así el mundo arranca sin corte.
- **Las tres piezas al salir de la ronda:** el deslizamiento de "La ronda" a la colección hace un fundido a negro corto (`opacity`) para separar el mundo del catálogo.
- Tests: `YerbaLeaves` y el vapor se montan solo en la parada actual y con movimiento; el "zoom" se calcula con una función pura `diveTransform(progress)` testeada; portada con el poster y sin `StoryVisual`. E2E `home.spec.ts`: la portada tiene el poster; axe sin hallazgos; sin desborde. Capturas a 1440×900 de la portada y del deslizamiento "entrar al mate".

## Estado

**Task 1 (2026-10-29): hecha.** El motor funciona completo con los seis posters:

- `world-media.ts`: `WORLD_ORDER`, `WORLD_MEDIA` (todos los `clip` en `null`), `worldStops` y `worldLayer` (opacidad y avance local de cada capa con la curva de `stageLayout`).
- `StoryWorld.tsx`: una capa por parada con su poster (`next/image`, solo el primero con prioridad), cámara de 1 a 1,06 y de −1,5vw a 1,5vw, fundido cruzado en el deslizamiento; con clip, video frotado, carga por cercanía y `play()`/`pause()` al cargar, sin video con menos movimiento o ahorro de datos.
- `StoryStage.tsx` sin pista: paneles apilados (`StoryStop` con `current`), velo, raíl con los nombres nuevos; `StoryMate` borrado. Las escenas apiladas siguen `WORLD_ORDER`.
- E2E del paseo actualizado (el mate en la tercera parada, la capa del mundo actual, los paneles altos a 1600×750 y 1920×700); capturas a 1440×900 en el workspace del SDD.

**Desvíos**: en el escenario todas las paradas usan el tono oscuro (el texto va sobre fotos oscuras y un velo del color de fondo), y el texto lleva un halo del color de fondo para separarlo de las partes claras de los cuadros (el galpón y la bombilla); el fondo propio de cada parada y la palabra "Bombilla" de fondo quedan solo en las escenas apiladas. `media-src` no se agregó: la CSP no lo declara y cae en `default-src 'self'`, que ya permite los clips propios.

**Falta**: los clips `.mp4` (con la misma convención de rutas) y el cuadro del taller para `gourd` (hoy, el armado con la foto real del mate de calabaza de `f62bbfc`, documentado como provisorio en `WORLD_MEDIA`).

**Task 2 (2026-10-29): hecha.** Vida sin video, con los mismos seis posters:

- `world-media.ts`: cada `WorldMedia` suma su encuadre (`framing`: ancla y acercamiento), la boca del mate (`mouth`) y lo que se mueve (`life`); `WORLD_DIVE` (del mate a la bombilla), `diveTransform` (escalas 1 a 2,2 y 0,92 a 1 y el paneo de boca a boca) y `worldFade` (el negro en el 35 % final de la ronda).
- `StoryWorld.tsx`: la zambullida, `YerbaLeaves` en el mate y `MateSteam` en el ritual y la ronda (solo en la parada actual), el fundido a negro y el clip que se aleja se suelta. Sin `LazyMotion` propio.
- Portada: el cuadro del mate de fondo con el encuadre y el velo del mundo, y `HeroLife` (hojas y vapor desde 1024 px). Sin `StoryVisual`.
- Paneles: entrada escalonada propia al volverse el actual; sus `Reveal` (salvo el primer panel) se dibujan ya en su estado final (`SceneReveal`).

**Desvíos**: el mate de la tercera parada se corre con ancla a la izquierda y acercamiento de 1,15 (no con `object-position` solo: a 1440 × 900 el cuadro sobra 65 px por lado); la bombilla se acerca 1,12 para que la zambullida no deje ver su borde; la boca del mate del cuadro que se deja viaja hasta la de la bombilla en la primera mitad de la zambullida, para que las dos coincidan durante el fundido.

**Falta**: los clips y el cuadro del taller, como antes; con los clips, `life` y `mouth` de cada parada se revisan.
