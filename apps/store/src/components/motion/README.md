# components/motion

Animaciones de la etapa 1 de la tienda (spec §17). Son Client Components con `LazyMotion` + `m` de
`motion/react`; cada uno carga sus funciones de animación por su cuenta, así que se pueden montar en
cualquier parte. Todo se importa desde `@/components/motion`.

**Regla de oro:** con `prefers-reduced-motion: reduce` el contenido se muestra en su estado final,
sin animar, y nunca queda invisible. Los efectos de mouse (`Tilt`, `Magnetic`, `MouseParallax`)
además ignoran punteros que no son un mouse. Las curvas salen de `tokens.easing` (`EASE_MAIN` y
`EASE_SPRING`). Tiempos en milisegundos. Las props numéricas inválidas lanzan `RangeError`.

| Componente                 | Qué hace                                                                                 | Props principales                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `Reveal`                   | Aparece al entrar en pantalla (una vez)                                                  | `kind` (`up`, `rise`, `fade`, `scale`, `left`, `clip`, `bar`), `delay`, `duration`, `as` |
| `RiseText`                 | Título cuyas líneas suben desde una máscara                                              | `lines`, `as`, `delay`, `stagger`                                                        |
| `PageEnter`                | Entrada del contenido en cada navegación (desenfoque + 24 px, 800 ms, 180 ms de retraso) | `children`                                                                               |
| `PageCurtain`              | Cortina con el logo al cambiar de página                                                 | `children` (el logo)                                                                     |
| `Tilt`                     | Inclinación 3D con el mouse                                                              | `max` (10), `perspective`                                                                |
| `Magnetic`                 | Botón que se corre hacia el mouse                                                        | `strength` (0,3), `reach`                                                                |
| `CountUp`                  | Cifra que cuenta (1800 ms, coma decimal)                                                 | `value`, `decimals`, `prefix`, `suffix`                                                  |
| `ScrubText`                | Texto que se ilumina por palabra con el scroll                                           | `text`, `as`                                                                             |
| `Float`                    | Flotación suave                                                                          | `distance`, `duration`, `delay`                                                          |
| `GridReplay`               | Reaparición escalonada de la grilla (45 ms por tarjeta)                                  | `replayKey`, `step`                                                                      |
| `TabFade`                  | Fundido al cambiar de pestaña                                                            | `tabKey`                                                                                 |
| `Ping`                     | Punto que late (stock)                                                                   | `color`, `haloColor`, `size`                                                             |
| `MouseParallax`            | Parallax con el mouse                                                                    | `strength` (30; negativo invierte)                                                       |
| `DrawCheck`                | Check que se dibuja                                                                      | `size`, `color`, `label`                                                                 |
| `Shake`                    | Temblor de un campo con error; `shake()` por `ref`                                       | `ref`                                                                                    |
| `HorizontalScroll`         | Sección fija con la pista de tarjetas que avanza con el scroll                           | `header`, `HorizontalScrollProgress`                                                     |
| `ScrollStage`              | Escenario fijo a la altura de la ventana; `useScrollStage()` da avance y `scrollToStop`  | `stops`, `label`                                                                         |
| `useScrollTopOnStep(step)` | Sube suavemente al cambiar de paso (kit, checkout)                                       | `step`                                                                                   |
| `useMediaQuery(query)`     | Si se cumple una consulta de medios (`false` en el servidor y al hidratar)               | `query`                                                                                  |

## Cosas a tener en cuenta

- `PageEnter` y `PageCurtain` se montan **una sola vez** en el layout. `PageEnter` no remonta el
  contenido (conserva su estado) y no anima la primera carga. Su vigilante de ruta lleva su propio
  `Suspense` (lo exige `useSearchParams`), así que el contenido no queda afectado.
- `usePrefersReducedMotion` (propio) reemplaza a `useReducedMotion` de Motion: el primer render de la
  hidratación coincide con el del servidor y recién después se aplica la preferencia, para no dejar
  oculto el contenido que el servidor ya había dibujado oculto.
- `ScrollStage` no dibuja nada propio: mide `(paradas + 1) × 100svh` y quien dibuja adentro decide
  qué se mueve con `progress`. Un elemento con `data-stage-stop="n"` marca la parada `n`: al
  enfocar algo adentro con el teclado, la página va a esa parada. No se adapta a
  `prefers-reduced-motion` (salvo el salto de `scrollToStop`): quien lo monta decide si corresponde.
- `Reveal` sin `IntersectionObserver` muestra el contenido sin animar (en lugar de dejarlo oculto).
- `Tilt`: `max` es el recorrido total, como el `tiltStrength` del diseño; en los bordes llega a
  `max / 2`.
- `Ping` anima un halo con `transform` y `opacity` en lugar de la sombra del diseño.
- Los efectos que dejaban un `filter: blur(0px)` puesto lo quitan al terminar la animación.
- El barrel `@/components/motion` se puede importar desde un Server Component (por ejemplo, una
  página con `Reveal`): todos los módulos que reexporta, hooks incluidos, empiezan con
  `'use client'`. Un módulo nuevo que use React o Motion debe llevar la directiva; lo comprueba
  `client-boundary.test.ts`. Desde un Server Component solo se renderizan los componentes: las
  funciones y los hooks exportados (`formatCount`, `usePrefersReducedMotion`…) se llaman desde
  Client Components.
