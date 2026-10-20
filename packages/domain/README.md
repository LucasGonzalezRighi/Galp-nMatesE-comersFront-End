# @galpon/domain

Reglas de negocio puras de Galpón Mates, compartidas por la tienda y el dashboard.

- **Sin dependencias**: solo TypeScript y las APIs estándar de JavaScript (`Intl`, `Number`).
- **Sin efectos**: funciones puras, sin red, sin almacenamiento y sin React.
- **Test primero**: cada regla se escribe con su test antes que el código (`src/*.test.ts`).
- Exporta el código fuente (`src/index.ts`), sin paso de build; Next y Vite lo transpilan.

Puede importarse desde cualquier app y desde `schemas` y `api-client`; `domain` no importa de ningún otro paquete.

## Módulos

| Módulo       | Qué resuelve                                                                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `money.ts`   | Tipo `Pesos` (entero de pesos con marca), validación con `pesos()`, formato "$39.999" sin espacio, descuentos con el signo menos U+2212 ("−$3.600", "−10%") y suma de montos                                                   |
| `options.ts` | Cueros (Negro, Marrón, Crudo, Borravino) y virolas (Alpaca lisa, Alpaca cincelada, Acero) de los mates, con sus valores por defecto, la virola fija del kit y los type guards                                                  |
| `catalog.ts` | Grupos y estados de producto, regla de "comprable", cantidad máxima (20), código "N°07", orden del listado (destacados, menor, mayor, A-Z; los "a consultar" al final) y productos relacionados (misma línea primero, hasta 4) |
| `text.ts`    | Normalización de texto para buscar (sin acentos ni mayúsculas), `matchesSearch` y `slugify`                                                                                                                                    |

## Uso

```ts
import { formatDiscountPesos, formatPesos, pesos, sumPesos } from '@galpon/domain'

const subtotal = sumPesos([pesos(39999), pesos(12500)])
formatPesos(subtotal) // "$52.499"
formatDiscountPesos(pesos(3600)) // "−$3.600"
```
