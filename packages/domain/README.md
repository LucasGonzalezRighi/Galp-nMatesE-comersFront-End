# @galpon/domain

Reglas de negocio puras de Galpón Mates, compartidas por la tienda y el dashboard.

- **Sin dependencias**: solo TypeScript y las APIs estándar de JavaScript (`Intl`, `Number`).
- **Sin efectos**: funciones puras, sin red, sin almacenamiento y sin React.
- **Test primero**: cada regla se escribe con su test antes que el código (`src/*.test.ts`).
- Exporta el código fuente (`src/index.ts`), sin paso de build; Next y Vite lo transpilan.

Puede importarse desde cualquier app y desde `schemas` y `api-client`; `domain` no importa de ningún otro paquete.

## Módulos

| Módulo            | Qué resuelve                                                                                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `money.ts`        | Tipo `Pesos` (entero de pesos con marca), validación con `pesos()`, formato "$39.999" sin espacio, descuentos con el signo menos U+2212 ("−$3.600", "−10%") y suma de montos                                                   |
| `options.ts`      | Cueros (Negro, Marrón, Crudo, Borravino) y virolas (Alpaca lisa, Alpaca cincelada, Acero) de los mates, con sus valores por defecto, la virola fija del kit y los type guards                                                  |
| `catalog.ts`      | Grupos y estados de producto, regla de "comprable", cantidad máxima (20), código "N°07", orden del listado (destacados, menor, mayor, A-Z; los "a consultar" al final) y productos relacionados (misma línea primero, hasta 4) |
| `text.ts`         | Normalización de texto para buscar (sin acentos ni mayúsculas), `matchesSearch` y `slugify`                                                                                                                                    |
| `cart.ts`         | Líneas del carrito (producto suelto o kit): clave derivada del contenido para sumar líneas iguales, alta, cambio de cantidad, baja y cantidades ya en el carrito por producto                                                  |
| `kit.ts`          | Descuento del kit (10% de fábrica, hasta 30%), cálculo del ahorro, orden de las piezas (mate, bombilla, yerba) y si el kit está completo                                                                                       |
| `totals.ts`       | Importes de cada línea (bruto, ahorro y total) y totales del carrito y del pedido: subtotal, envío y total                                                                                                                     |
| `shipping.ts`     | Métodos de envío (domicilio, sucursal, retiro), las tres opciones de fábrica con su costo y plazo, los campos de dirección que pide cada método y las 24 provincias del selector                                               |
| `installments.ts` | Monto informativo de cada cuota (`round(total / cuotas)`) y porcentajes con coma y dos decimales para la leyenda de CFT y TEA ("0,00 %")                                                                                       |
| `tax.ts`          | Precio sin impuestos nacionales a partir del precio final y la alícuota de IVA (admite decimales, como el 10,5%)                                                                                                               |
| `ratings.ts`      | Reseñas: `isValidRating` (pasos de media estrella), promedio, promedio con coma ("4,7"), distribución de 5 a 1 con porcentajes (4,5 cuenta en la fila de 4), palabras del formulario y plural de "1 reseña" / "0 reseñas"      |
| `dates.ts`        | Fechas visibles siempre en hora de Buenos Aires: "Sep 2026", "19/10/2026" y "19/10/2026 14:05"; una reseña del 1/9 a las 02:00 UTC se muestra "Ago 2026"                                                                       |
| `orders.ts`       | Estados del pedido y del pago, formas de pago, formato del número de pedido (`GLP-12345`) y minutos de reserva del stock (30)                                                                                                  |

## Uso

```ts
import { formatDiscountPesos, formatPesos, pesos, sumPesos } from '@galpon/domain'

const subtotal = sumPesos([pesos(39999), pesos(12500)])
formatPesos(subtotal) // "$52.499"
formatDiscountPesos(pesos(3600)) // "−$3.600"
```
