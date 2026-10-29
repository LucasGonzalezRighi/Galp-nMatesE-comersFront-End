# mate3d: la escena 3D del Mate Imperial Premium

El mate que se arma con el scroll en las tres paradas del inicio. Es el porte a TypeScript de
`docs/design/galpon-tienda-v3/mate3d-scene.js` con cuatro cambios: el cuero es negro fijo (sin el
campo `color` ni la lista de cueros), el paquete lleva la foto real de Canarias al frente
(`/hero/3d/yerba-canarias-front.jpg`), el interior curado usa `/hero/3d/mate-interior.png` y la
yerba usa la foto real de Lucas (`/hero/3d/yerba-albedo.jpg`, en mosaico de 2,2).

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

| Módulo         | Qué hace                                                                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`     | Los tipos del contrato: `SceneFrame`, `SceneModule`, `SceneMaterials`, `SceneShared` y los módulos que exponen algo (`MateModule`, `PackModule`, `YerbaModule`).                                              |
| `materials.ts` | `createMaterials(T)`: cuero, alpaca cincelada y lisa, bronce, la yerba con su foto real, el curado, el vapor y la sombra, y los pintores (`paint`, `load`, `radial`, `random`) con que los módulos hacen más. |
| `place.ts`     | `place(objeto, colocación, vista)`: la colocación en fracciones de media pantalla (más juntas y chicas en pantalla angosta).                                                                                  |
| `mate.ts`      | La calabaza, la virola, el aro, el interior, la pared, las patas y la sombra; expone `mateRoot`, `mate`, `mouthY` (1,01) e `interiorRadius` (0,4).                                                            |
| `pack.ts`      | El paquete de Canarias con su pico (`spout`) como ancla de la yerba que cae.                                                                                                                                  |
| `yerba.ts`     | La yerba de adentro (hoy disco, montañita y mancha húmeda) y las partículas que caen del pico; expone `hollowCenter` (el hueco, en coordenadas de `mate`).                                                    |
| `bombilla.ts`  | La bombilla y su ancla de calce dentro del mate.                                                                                                                                                              |
| `water.ts`     | El agua: hoy el chorro como cilindro fino y el vapor; acá van el termo, el chorro, la salpicadura y el charco.                                                                                                |
| `smoothing.ts` | Puro. `smoothingShare(dt)`: el suavizado por tiempo, `1 − (1 − 0,055)^(dt·60)`.                                                                                                                               |
| `dispose.ts`   | `disposeTree(raíz)`: libera geometrías, materiales e instancias de un árbol.                                                                                                                                  |

`scene.ts` crea los módulos en orden (materiales, mate, paquete, yerba, bombilla, agua) y los
acomoda cada cuadro en ese orden: el paquete antes que la yerba (cae de su pico) y la yerba antes que
la bombilla y el agua (leen su hueco). Mientras la yerba sea disco y media esfera, interpreta `slope`
y `wall` como la montañita de antes: `slope · min(1, 0,3 + 2·wall)`.

## El estado

`MateState` es lo que la escena muestra en un momento. Las colocaciones son tuplas
`[x, y, escala, giroX, giroY, giroZ]`: `x` e `y` en fracciones de media pantalla desde el centro
(1 es el borde derecho o el de arriba; con más de 1 la pieza queda fuera de cuadro), la escala 1 es
el tamaño del diseño y los giros van en grados (orden XYZ: el giro Z inclina la pieza en su propio
eje; positivo, hacia la izquierda de la pantalla).

| Campo      | Rango      | Qué controla                                                                                                     |
| ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| `mate`     | colocación | Dónde está y cómo gira el mate; el giro Z lo inclina (55 en la parada 1). Encima van el parallax y la flotación. |
| `bombilla` | colocación | La bombilla suelta, mientras `attached` es 0: entra desde arriba a la derecha.                                   |
| `attached` | 0 a 1      | Cuánto está calzada la bombilla en la yerba.                                                                     |
| `pack`     | colocación | El paquete de yerba. Con el giro Z cerca de −150 queda cabeza abajo, con el pico sobre la boca inclinada.        |
| `thermos`  | colocación | El pico del termo (la boca por donde sale el agua); el giro Z positivo lo inclina para servir.                   |
| `fill`     | 0 a 1      | Volumen de yerba, del fondo curado (0) a la virola (1).                                                          |
| `slope`    | 0 a 1      | Pendiente de la yerba: 1 es asentada contra la pared izquierda, como la deja el mate inclinado.                  |
| `wall`     | 0 a 1      | Pared de la montañita: 1 es la cara derecha cayendo recta, como después de sacudir el mate tapado.               |
| `wet`      | 0 a 1      | Yerba húmeda en el hueco junto a la bombilla.                                                                    |
| `water`    | 0 a 1      | El chorro del termo que cae en el hueco.                                                                         |
| `steam`    | 0 a 1      | El vapor que sube del mate.                                                                                      |
| `puddle`   | 0 a 1      | El agua juntada en el hueco (el charco).                                                                         |
| `splash`   | 0 a 1      | La salpicadura del chorro al caer.                                                                               |
| `pour`     | 0 a 1      | La yerba que cae del pico del paquete a la boca del mate.                                                        |
| `tilt`     | grados     | Inclinación extra de la bombilla calzada; 0 es la del diseño.                                                    |

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
| `bombilla`  | todo el hold 2  | Parada 2: el mate de pie, girado para mostrar el hueco; la pared recta (`wall 1`) y la bombilla calzada.                                                              |
| `agua`      | 2/3 + hold·0,25 | El pico del termo arriba a la derecha y el chorro en el hueco (`water 1`, `splash 1`, `wet 0,7`, `puddle 0,5`, `steam 0,6`); la parada 3 llega con el termo entrando. |
| `agua-fin`  | fin del hold 3  | El chorro cortó (`water 0`, `splash 0`): quedan el charco, la yerba húmeda y el vapor (`wet`, `puddle` y `steam` en 1); el termo sube.                                |
| `salida`    | 1               | El mate se aleja hacia la derecha y abajo, más chico; termo fuera y vapor a medias. Entra el catálogo.                                                                |

Las colocaciones de `inclinado` se midieron con `three` a 16:9: el pico del paquete queda unos 0,66
sobre el centro de la boca inclinada. Los demás valores son los iniciales del plan y se afinan a la
vista en la tienda compilada.

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

## Por qué sin `@react-three/fiber`

La escena del diseño es three puro y `@react-three/fiber` no está entre las dependencias del
proyecto (no se suman dependencias nuevas). La escena no tiene estado de React: un objetivo que cambia
con el scroll y un bucle de `requestAnimationFrame`, así que un envoltorio chico (`MateCanvas`, que
monta, pausa y libera) alcanza y evita un renderizador de React por cuadro.

## Ajustes después de verla

Con la tienda compilada (Task 2 del mate 3D) se tocaron tres valores, comentados en el código: el
cuero lleva `sheenRoughness` 0,4 (`scene/materials.ts`; con el brillo cobre repartido en toda la
superficie se leía marrón), el chorro de agua termina en 0,3 de `mateRoot` (`scene/water.ts`;
adentro de la yerba, que lo tapa) y el vapor llega a 0,75 de opacidad (`scene/water.ts`; con 0,5
casi no se veía sobre los fondos oscuros).

## Rendimiento y respaldo

- `three` se descarga recién cuando el lienzo entra en pantalla (`import()` dentro de `scene.ts`) y
  queda en un chunk aparte; nunca corre en el servidor. Los módulos de `scene/` solo importan tipos.
- El dibujo se pausa fuera de pantalla y con la pestaña oculta; pixel ratio de 1,5 como máximo; sin
  sombras de luz (la sombra es un sprite).
- Sin WebGL o si la escena no se puede crear, `MateCanvas` llama a `onUnavailable` y la feature
  muestra la foto del mate en su lugar. Con menos movimiento el lienzo no se monta.
