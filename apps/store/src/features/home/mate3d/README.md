# mate3d: la escena 3D del Mate Imperial Premium

El mate que se arma con el scroll en las tres paradas del inicio. Es el porte a TypeScript de
`docs/design/galpon-tienda-v3/mate3d-scene.js` con tres cambios: el cuero es negro fijo (sin el
campo `color` ni la lista de cueros), el paquete lleva la foto real de Canarias al frente
(`/hero/3d/yerba-canarias-front.jpg`) y el interior curado usa `/hero/3d/mate-interior.png`.

| Archivo            | Qué hace                                                                                                                                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keyframes.ts`     | Puro. El tipo `MateState`, los momentos del recorrido (`MATE_KEYFRAMES`) y `mateStateAt(progress)`, que los interpola.                                                                                                                         |
| `scene.ts`         | Cliente, sin React. `createMateScene(canvas)` carga `three` con `import()` y devuelve `setState`, `setPointer`, `setVisible`, `resize` y `dispose`.                                                                                            |
| `webgl-support.ts` | Puro. `supportsWebGL(probe)` pide un contexto `webgl2` o `webgl` a un lienzo de prueba.                                                                                                                                                        |
| `MateCanvas.tsx`   | El lienzo `aria-hidden` que crea la escena al entrar en pantalla, le pasa el avance, el mouse y la visibilidad, y avisa con `onUnavailable` si no hay WebGL; transparente hasta que la escena existe y entonces aparece con un fundido de 1 s. |

## El estado

`MateState` es lo que la escena muestra en un momento. Las colocaciones son tuplas
`[x, y, escala, giroX, giroY, giroZ]`: `x` e `y` en fracciones de media pantalla desde el centro
(1 es el borde derecho o el de arriba; con más de 1 la pieza queda fuera de cuadro), la escala 1 es
el tamaño del diseño y los giros van en grados.

| Campo      | Rango      | Qué controla                                                                                           |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| `mate`     | colocación | Dónde está y cómo gira el mate. Encima se suman el parallax del mouse, un vaivén lento y la flotación. |
| `bombilla` | colocación | La bombilla suelta, mientras `attached` es 0: de dónde entra o adónde se va.                           |
| `attached` | 0 a 1      | Cuánto está calzada la bombilla en la yerba. A mitad de camino se desvanece y reaparece calzada.       |
| `pack`     | colocación | El paquete de yerba. El giro Z lo vuelca (unos −118° dejan el pico sobre la boca del mate).            |
| `fill`     | 0 a 1      | Altura del disco de yerba, del fondo curado (0) a la virola (1).                                       |
| `mound`    | 0 a 1      | Alto de la montañita sobre el disco.                                                                   |
| `wet`      | 0 a 1      | Mancha de yerba húmeda junto a la bombilla.                                                            |
| `water`    | 0 a 1      | Chorro de agua que baja desde arriba del cuadro hasta junto a la bombilla (la pava no se modela).      |
| `steam`    | 0 a 1      | Los 9 sprites de vapor que suben de la boca.                                                           |
| `pour`     | 0 a 1      | Las 80 partículas de yerba que caen del pico del paquete a la boca del mate (con más de 0,05).         |
| `tilt`     | grados     | Inclinación extra de la bombilla calzada; 0 es la del diseño, apoyada en la montañita.                 |

`setState` solo cambia el objetivo: cada cuadro la escena se acerca un 5,5 % (el 0,055 del diseño),
así el scroll se ve suave aunque llegue a saltos.

## Los momentos

`progress` va de 0 a 1 sobre las tres paradas y la salida; cada parada ocupa un tercio y su hold es
el 55 % inicial de su tercio (`HOLD_SHARE` de `stage-layout.ts`). Entre dos momentos la
interpolación usa la curva quíntica del diseño (quieta el primer y el último 8 % del tramo).

| Momento    | Avance           | Qué se ve                                                                         |
| ---------- | ---------------- | --------------------------------------------------------------------------------- |
| `inicio`   | 0                | Parada 1: el mate vacío a la derecha, como la portada; el paquete fuera arriba.   |
| `vuelco`   | mitad del hold 1 | El paquete inclinado vuelca y cae la yerba (`pour 1`); el mate a medio llenar.    |
| `lleno`    | fin del hold 1   | Mate lleno con su montañita (`fill 1`, `mound 1`, `pour 0`).                      |
| `bombilla` | todo el hold 2   | Parada 2: el mate girado hacia la cámara, la bombilla calzada; el paquete se fue. |
| `agua`     | todo el hold 3   | Parada 3: chorro de agua, yerba húmeda y vapor (`water`, `wet` y `steam` en 1).   |
| `salida`   | 1                | El mate se aleja hacia la derecha y abajo, más chico; entra el catálogo.          |

## Cómo ajustar un keyframe

1. Buscá el momento por su `name` en `MATE_KEYFRAMES` (`keyframes.ts`) y cambiá su `state`. Para mover
   una pieza, tocá su tupla: `x` e `y` la llevan por la pantalla, el tercer número la agranda y los
   tres últimos la giran en grados.
2. Para que algo pase antes o después, cambiá `from` y `to` del momento. Tienen que quedar en orden y
   sin solaparse con los vecinos (`from` mayor que el `to` anterior); el test de `MATE_KEYFRAMES` lo
   controla.
3. Corré `npx vitest run --project store apps/store/src/features/home/mate3d`: los tests fijan lo
   que cada parada tiene que mostrar (lleno en el fin del hold 1, bombilla calzada en la 2, agua y
   vapor en la 3). Si cambiás eso a propósito, cambiá el test también.
4. Miralo en la tienda compilada (`npm run build -w @galpon/store` y `npm run start -w @galpon/store`):
   jsdom no tiene WebGL, así que la escena solo se ve en el navegador.

## Por qué sin `@react-three/fiber`

La escena del diseño es three puro y `@react-three/fiber` no está entre las dependencias del
proyecto (no se suman dependencias nuevas). La escena no tiene estado de React: un objetivo que cambia
con el scroll y un bucle de `requestAnimationFrame`, así que un envoltorio chico (`MateCanvas`, que
monta, pausa y libera) alcanza y evita un renderizador de React por cuadro.

## Ajustes después de verla

Con la tienda compilada (Task 2) se tocaron tres valores de `scene.ts`, comentados en el código: el
cuero lleva `sheenRoughness` 0,4 (con el brillo cobre repartido en toda la superficie se leía
marrón; así queda concentrado en los bordes y el reflejo del estudio no cambia), el chorro de agua
termina en 0,3 de `mateRoot` (adentro de la yerba, que lo tapa; con el 0,5 del diseño quedaba cortado
en el aire) y el vapor llega a 0,75 de opacidad (con 0,5 casi no se veía sobre los fondos oscuros).
Los keyframes quedaron como estaban.

## Rendimiento y respaldo

- `three` se descarga recién cuando el lienzo entra en pantalla (`import()` dentro de `scene.ts`) y
  queda en un chunk aparte; nunca corre en el servidor.
- El dibujo se pausa fuera de pantalla y con la pestaña oculta; pixel ratio de 1,5 como máximo; sin
  sombras de luz (la sombra es un sprite).
- Sin WebGL o si la escena no se puede crear, `MateCanvas` llama a `onUnavailable` y la feature
  muestra la foto del mate en su lugar. Con menos movimiento el lienzo no se monta.
