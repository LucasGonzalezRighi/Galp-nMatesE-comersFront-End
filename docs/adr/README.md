# Decisiones de arquitectura (ADR)

Cada ADR (_Architecture Decision Record_) explica **por qué** se decidió algo importante: el contexto, la decisión, lo que implica y las alternativas que se descartaron. Sirven para que, dentro de un año, alguien (incluido Lucas) entienda por qué el código es como es antes de cambiarlo.

| N°                                                        | Decisión                                                                                                                                          | Estado                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [0001](0001-next-tienda-y-vite-admin.md)                  | Next.js para la tienda (SEO y render estático) y Vite + React para el dashboard, en un mismo workspace                                            | Aceptada                                       |
| [0002](0002-contrato-openapi-fuente-de-verdad.md)         | `docs/api/openapi.yaml` es la fuente de verdad del contrato: tipos generados, `contract-alignment` y un test del back que lo compara              | Aceptada                                       |
| [0003](0003-modo-de-prueba-mock-en-servidor-y-rewrite.md) | API simulada en el servidor de Next con _rewrite_ de mismo dominio, y en el navegador (con `sessionStorage`) en el admin                          | Aceptada                                       |
| [0004](0004-mercado-pago-redireccion-y-secure-fields.md)  | Mercado Pago: redirección y tarjeta en la página (Secure Fields), 3-D Secure, idempotencia, un intento activo y estados normalizados              | Aceptada; la API concreta se fija en la fase 2 |
| [0005](0005-cloudinary-subida-firmada.md)                 | Cloudinary con subida firmada directa desde el navegador, por `XMLHttpRequest`                                                                    | Aceptada                                       |
| [0006](0006-montos-en-pesos-enteros.md)                   | Todos los montos son pesos enteros, sin centavos                                                                                                  | Aceptada                                       |
| [0007](0007-typescript-6-eslint-9-y-opciones.md)          | TypeScript 6.0.3, ESLint 9.39, sin `exactOptionalPropertyTypes`, jsdom 29, npm workspaces con versiones exactas y avisos conocidos de `npm audit` | Aceptada                                       |

## Cómo agregar un ADR

1. Copiar el más parecido y numerarlo con el siguiente número de cuatro cifras (`0008-...md`).
2. Mantener las secciones: **Estado**, **Fecha**, **Contexto**, **Decisión**, **Consecuencias** y **Alternativas consideradas**.
3. Sumarlo a la tabla de arriba.
4. Un ADR aceptado no se reescribe: si la decisión cambia, se escribe uno nuevo que diga cuál reemplaza (estado "Reemplazada por 000X") y se actualiza el estado del viejo.
