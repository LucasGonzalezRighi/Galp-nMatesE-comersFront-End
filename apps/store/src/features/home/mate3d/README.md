# mate3d: la escena 3D del Mate Imperial Premium

El mate que se arma con el scroll en las tres paradas del inicio. Es el porte a TypeScript de
`docs/design/galpon-tienda-v3/mate3d-scene.js` con cuatro cambios: el cuero es negro fijo (sin el
campo `color` ni la lista de cueros), el paquete lleva la foto real de Canarias al frente
(`/hero/3d/yerba-canarias-front.jpg`), el interior curado usa `/hero/3d/mate-interior.png` y la
yerba es un campo de alturas con la foto real de Lucas (`/hero/3d/yerba-albedo.jpg`, en mosaico de
1,3). Desde "el mate 3D realista" (plan `2026-10-29-mate-3d-realista.md`) el mate se inclina para
recibir la yerba, la montañita tiene su pared y el termo sirve un chorro con refracción.

| Archivo            | Qué hace                                                                                                                                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keyframes.ts`     | Puro. El tipo `MateState`, los momentos del recorrido (`MATE_KEYFRAMES`) y `mateStateAt(progress)`, que los interpola.                                                                                                                         |
| `scene.ts`         | Cliente, sin React. `createMateScene(canvas)` carga `three` con `import()`, arma el renderer, la cámara, el estudio y las luces, compone los módulos de `scene/` y devuelve `setState`, `setPointer`, `setVisible`, `resize` y `dispose`.      |
| `scene/`           | Los módulos de la escena (abajo). Sin React y sin `three` por valor: solo `import type * as Three from 'three'`; la biblioteca les llega como `T` desde `scene.ts`.                                                                            |
| `webgl-support.ts` | Puro. `supportsWebGL(probe)` pide un contexto `webgl2` o `webgl` a un lienzo de prueba.                                                                                                                                                        |
| `MateCanvas.tsx`   | El lienzo `aria-hidden` que crea la escena al entrar en pantalla, le pasa el avance, el mouse y la visibilidad, y avisa con `onUnavailable` si no hay WebGL; transparente hasta que la escena existe y entonces aparece con un fundido de 1 s. |

## Los módulos de `scene/`

Cada módulo tiene la misma forma: `createX(T, parent, shared) → { update(frame), dispose() }`.

- `T` es `three` (lo carga `scene.ts`); `parent` es donde van sus piezas en mundo (la escena); lo
  que va dentro del mate se cuelga de `shared.mate.mate`.
- `shared` (`SceneShared` de `types.ts`) lleva los materiales y lo que un módulo necesita de otro:
  `mate.mouthY` y `mate.interiorRadius`, `pack.spout` y `yerba.hollowCenter`. Cada `create` pide
  solo la parte que usa (`Pick<SceneShared, …>`).
- `update(frame)` corre una vez por cuadro con `frame = { state, t, dt, halfWidth, halfHeight,
narrow, mateRoot, mate }`: el estado ya suavizado, el reloj y el tiempo del cuadro en segundos, las
  medidas de la pantalla y el mate ya colocado. Todo lo que se ve sale del estado y de `t` (nada
  acumula tiempo), así que al volver atrás con el scroll se desarma igual.
- `dispose()` libera sus geometrías, materiales e instancias (`disposeTree`, que también libera las
  `InstancedMesh`) y saca sus piezas de la escena. Las texturas las libera `materials.dispose()`.

| Módulo           | Qué hace                                                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`       | Los tipos del contrato: `SceneFrame`, `SceneModule`, `SceneMaterials`, `SceneShared` y los módulos que exponen algo (`MateModule`, `PackModule`, `YerbaModule`).                                         |
| `materials.ts`   | `createMaterials(T)`: cuero, alpaca cincelada y lisa, bronce, la foto real de la yerba, el curado y la sombra, y los pintores (`paint`, `load`, `radial`, `random`) con que los módulos hacen más.       |
| `place.ts`       | `place(objeto, colocación, vista)`: la colocación en fracciones de media pantalla (más juntas y chicas en pantalla angosta).                                                                             |
| `mate.ts`        | La calabaza, la virola, el aro, el interior, la pared, las patas y la sombra; expone `mateRoot`, `mate`, `mouthY` (1,01) e `interiorRadius` (0,4).                                                       |
| `pack.ts`        | El paquete de Canarias con su pico (`spout`, la esquina abierta de la tapa) como ancla de la yerba que cae; la solapa se abre y el paquete se sacude con `pour`.                                         |
| `yerba.ts`       | La yerba: campo de alturas polar (48 × 96) con la foto real, relieve, sombra y humedad por shader, y las hojas y el polvo que caen del pico; expone `hollowCenter` (el hueco, en coordenadas de `mate`). |
| `yerba-shape.ts` | Puro. `yerbaHeight(x, z, forma)` (meseta, pared y hueco, con grano), `hollowCenter(forma)` y `yerbaShade(x, z, forma)` (la sombra del piso del hueco y del pie de la pared).                             |
| `bombilla.ts`    | La bombilla y su ancla de calce: la pala hundida en el hueco y el caño apoyado en la virola; entra desde arriba a la derecha sin fundido.                                                                |
| `water.ts`       | El termo (pico en cuadro), el chorro con transmisión e índice 1,33 sobre `streamPoints`, la salpicadura, el charco y el vapor.                                                                           |
| `water-path.ts`  | Puro. `streamPoints(from, to, count)`: la curva del chorro, que baja siempre y cae casi vertical al final.                                                                                               |
| `smoothing.ts`   | Puro. `smoothingShare(dt)`: el suavizado por tiempo, `1 − (1 − 0,055)^(dt·60)`.                                                                                                                          |
| `dispose.ts`     | `disposeTree(raíz)`: libera geometrías, materiales e instancias de un árbol.                                                                                                                             |

`scene.ts` crea los módulos en orden (materiales, mate, paquete, yerba, bombilla, agua) y los
acomoda cada cuadro en ese orden: el paquete antes que la yerba (cae de su pico) y la yerba antes que
la bombilla y el agua (leen su hueco).

## El estado

`MateState` es lo que la escena muestra en un momento. Las colocaciones son tuplas
`[x, y, escala, giroX, giroY, giroZ]`: `x` e `y` en fracciones de media pantalla desde el centro
(1 es el borde derecho o el de arriba; con más de 1 la pieza queda fuera de cuadro), la escala 1 es
el tamaño del diseño y los giros van en grados (orden XYZ: el giro Z inclina la pieza en su propio
eje; positivo, hacia la izquierda de la pantalla).

| Campo      | Rango      | Qué controla                                                                                                                         |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `mate`     | colocación | Dónde está y cómo gira el mate; el giro Z lo inclina (55 en la parada 1). Encima van el parallax y la flotación.                     |
| `bombilla` | colocación | La bombilla suelta, mientras `attached` es 0: entra desde arriba a la derecha.                                                       |
| `attached` | 0 a 1      | Cuánto está calzada la bombilla en la yerba.                                                                                         |
| `pack`     | colocación | El paquete de yerba. Con el giro Z cerca de −150 queda cabeza abajo, con el pico sobre la boca inclinada.                            |
| `thermos`  | colocación | El pico del termo (la boca por donde sale el agua); con el giro Z cerca de 145 la boca mira abajo a la izquierda.                    |
| `fill`     | 0 a 1      | Volumen de yerba, del fondo curado (0) a la virola (1).                                                                              |
| `slope`    | 0 a 1      | Pendiente de la yerba: 1 es asentada contra la pared izquierda, como la deja el mate inclinado.                                      |
| `wall`     | 0 a 1      | Pared de la montañita: 1 es la cara derecha cayendo recta, como después de sacudir el mate tapado.                                   |
| `wet`      | 0 a 1      | Yerba húmeda en el hueco junto a la bombilla.                                                                                        |
| `water`    | 0 a 1      | El chorro del termo que cae en el hueco.                                                                                             |
| `steam`    | 0 a 1      | El vapor que sube del mate.                                                                                                          |
| `puddle`   | 0 a 1      | El agua juntada en el hueco (el charco).                                                                                             |
| `splash`   | 0 a 1      | La salpicadura del chorro al caer.                                                                                                   |
| `pour`     | 0 a 1      | La yerba que cae del pico del paquete a la boca del mate.                                                                            |
| `tilt`     | grados     | Cuánto se corre el apoyo del caño por la virola, en grados alrededor del eje del mate desde el lado derecho (negativo: hacia atrás). |

`setState` solo cambia el objetivo: la escena se acerca a él con un suavizado por tiempo (el 5,5 %
por cuadro a 60 Hz, igual a 30 o a 144 Hz), así el scroll se ve suave aunque llegue a saltos.

## Los momentos

`progress` va de 0 a 1 sobre las tres paradas y la salida; cada parada ocupa un tercio y su hold es
el 55 % inicial de su tercio (`HOLD_SHARE` de `stage-layout.ts`). Entre dos momentos la
interpolación usa la curva quíntica del diseño (quieta el primer y el último 8 % del tramo).

| Momento     | Avance          | Qué se ve                                                                                                                                                             |
| ----------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inicio`    | 0               | Parada 1: el mate de pie y vacío a la derecha, como la portada; paquete, bombilla y termo fuera de cuadro.                                                            |
| `inclinado` | hold·0,35       | El mate inclinado 55° a la izquierda y el paquete cabeza abajo sobre la boca (`pour 1`, `fill 0,45`, `slope 1`, `wall 0`).                                            |
| `lleno`     | hold·0,85       | Ya no cae yerba; el mate lleno, todavía a 40°, y el paquete saliendo por arriba a la izquierda (`fill 1`, `slope 1`, `wall 0,35`).                                    |
| `bombilla`  | todo el hold 2  | Parada 2: el mate de pie, visto desde arriba (giro X 45) y girado para mostrar el hueco; la pared recta (`wall 1`) y la bombilla calzada.                             |
| `agua`      | 2/3 + hold·0,25 | El pico del termo arriba a la derecha y el chorro en el hueco (`water 1`, `splash 1`, `wet 0,7`, `puddle 0,5`, `steam 0,6`); la parada 3 llega con el termo entrando. |
| `agua-fin`  | fin del hold 3  | El chorro cortó (`water 0`, `splash 0`): quedan el charco, la yerba húmeda y el vapor (`wet`, `puddle` y `steam` en 1); el termo sube.                                |
| `salida`    | 1               | El mate se aleja hacia la derecha y abajo, más chico; termo fuera y vapor a medias. Entra el catálogo.                                                                |

Las colocaciones de `inclinado` se midieron con `three` a 16:9: el pico del paquete (x 0,3) queda
sobre la boca inclinada y la yerba cae casi vertical. Las paradas 2 y 3 miran el mate desde arriba
(giro X 45 y 48): con menos de 45 la virola tapa el hueco (medido con raycast). El termo tiene la
misma escala (1,2) en todos los momentos, para que no cambie de tamaño al entrar.

## Cómo ajustar un keyframe

1. Buscá el momento por su `name` en `MATE_KEYFRAMES` (`keyframes.ts`) y cambiá su `state`. Para mover
   una pieza, tocá su tupla: `x` e `y` la llevan por la pantalla, el tercer número la agranda y los
   tres últimos la giran en grados.
2. Para que algo pase antes o después, cambiá `from` y `to` del momento. Tienen que quedar en orden y
   sin solaparse con los vecinos (`from` mayor que el `to` anterior); el test de `MATE_KEYFRAMES` lo
   controla.
3. Corré `npx vitest run --project store apps/store/src/features/home/mate3d`: los tests fijan lo
   que cada momento tiene que mostrar (un `it` por momento). Si cambiás eso a propósito, cambiá el
   test también.
4. Miralo en la tienda compilada (`npm run build -w @galpon/store` y `npm run start -w @galpon/store`):
   jsdom no tiene WebGL, así que la escena solo se ve en el navegador.

## Cómo ajustar la pared y el chorro

- **La pared de la montañita** sale de `scene/yerba-shape.ts`: `WALL_X` (dónde cae, 0,05 a la derecha
  del centro), `STEEP_WIDTH` y `NATURAL_WIDTH` (el ancho de la caída con `wall 1` y con `wall 0`),
  `HOLLOW_DEPTH` (cuánto más bajo queda el hueco, 0,22), `WALL_WOBBLE` (cuánto ondula, para que no
  parezca un corte) y `HOLLOW_X`/`HOLLOW_Z` (el centro del hueco, que usan la bombilla y el agua). Los
  tests de `yerba-shape.test.ts` fijan que la pared con `wall 1` ocupe menos de 0,05. Cuánto se ve
  la pared depende de la cámara: es el giro X del mate en `bombilla` y `agua` (`keyframes.ts`).
- **El color y el grano de la yerba** van en `scene/yerba.ts` (`YERBA_TINT`, `YERBA_BUMP_SCALE`, la
  sombra del hueco con `HOLLOW_SHADE` y `FOOT_SHADE`, la humedad con `WET_*`),
  `scene/yerba-shape.ts` (`OCCLUSION_*`: hasta dónde llega la banda oscura al pie de la pared) y
  `scene/materials.ts` (`YERBA_REPEAT`, `YERBA_TURN`, `YERBA_SHIFT`: el tamaño de las hojas de la
  foto y dónde caen los ejes del espejado).
- **La yerba que cae**: `FLAKE_WIDTH`/`FLAKE_HEIGHT`, `STREAM_OPEN`/`STREAM_SPREAD` (el ancho del
  chorro de hojas), `LANDING_SHARE` (dónde aterriza) y el polvo (`DUST_*`) en `scene/yerba.ts`; de
  dónde sale lo decide el paquete (`pack` de `inclinado` en `keyframes.ts`).
- **El chorro de agua** sale de la boca del pico (`thermos` de `agua` en `keyframes.ts`: posición y
  giro Z) y cae en `hollowCenter` más `IMPACT_OFFSET` (`scene/water.ts`); `STREAM_RADIUS` es su
  grosor arriba y abajo, y la curva la da `streamPoints` (`scene/water-path.ts`). El charco
  (`PUDDLE_*` y su material) y el vapor (cantidad y opacidad por nube) también están en `water.ts`.

## Por qué sin `@react-three/fiber`

La escena del diseño es three puro y `@react-three/fiber` no está entre las dependencias del
proyecto (no se suman dependencias nuevas). La escena no tiene estado de React: un objetivo que cambia
con el scroll y un bucle de `requestAnimationFrame`, así que un envoltorio chico (`MateCanvas`, que
monta, pausa y libera) alcanza y evita un renderizador de React por cuadro.

## Ajustes después de verla

Con la tienda compilada (Task 2 del mate 3D) el cuero pasó a `sheenRoughness` 0,4
(`scene/materials.ts`; con el brillo cobre repartido en toda la superficie se leía marrón).

Con la GPU real a 1440 × 900 (Task 3 del mate realista), todos comentados en el código: la yerba
lleva el tinte `#a9b28c` (se leía mostaza) y la foto en mosaico de 1,3, girada 0,5 rad y corrida
(con 2,2 se leía como fieltro y se veían las rosetas del espejado); las hojitas que caen miden
0,02 × 0,03 y el chorro de hojas se abre más; la alpaca lisa tiene aspereza 0,32 (el caño de la
bombilla, visto desde arriba, se leía negro); el charco es más transparente (0,72) con el borde que
se apaga desde el 35 % del radio, y el vapor (`strength` por nube de 0,9 a 1,2, con tope 1 al pintar,
manchas más densas y un recorrido de 1,25 veces la escala del mate; con 0,5 a 0,8 casi no se leía).

En el pulido final (Task 7 del mate realista) el hueco quedaba del mismo tono que la meseta y sin
sombra al pie de la pared: `yerbaShade` pinta un atributo por vértice (el piso del hueco multiplica
la yerba por `HOLLOW_SHADE`, algo menos de la mitad de la luz, y la banda al pie de la pared la baja
otro 78 %, una oclusión ambiental pintada sin sombras de luz), y el tinte pasó a `#a4ab97` (con
`#a9b28c` seguía apenas más amarilla que la yerba de la foto del fondo).

## Rendimiento y respaldo

- `three` se descarga recién cuando el lienzo entra en pantalla (`import()` dentro de `scene.ts`) y
  queda en un chunk aparte; nunca corre en el servidor. Los módulos de `scene/` solo importan tipos.
- El dibujo se pausa fuera de pantalla y con la pestaña oculta; pixel ratio de 1,5 como máximo; sin
  sombras de luz (la sombra es un sprite).
- Sin WebGL o si la escena no se puede crear, `MateCanvas` llama a `onUnavailable` y la feature
  muestra la foto del mate en su lugar. Con menos movimiento el lienzo no se monta.
