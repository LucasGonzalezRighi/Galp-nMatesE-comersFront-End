# 0006. Montos en pesos enteros

- **Estado**: Aceptada
- **Fecha**: 2026-10-20

## Contexto

Los precios del negocio son enteros ($39.999) y los descuentos y envíos también. Si el front calcula con decimales y el back con otra precisión, pueden aparecer diferencias de centavos entre lo que se muestra y lo que se cobra. Es la decisión D1 del diseño del front.

## Decisión

Todos los montos del sistema son **pesos enteros, sin centavos**.

- En `@galpon/domain` el tipo es `Pesos` (un `number` con marca, para que no se use cualquier número como monto). Solo se crea con `pesos(valor)`, que lanza `RangeError` si el valor no es un entero seguro mayor o igual a 0.
- En el contrato, los campos llevan el sufijo `Ars` (`priceArs`, `totalArs`) y son enteros; los que pueden faltar son `NullablePesos` (un producto "a consultar" no tiene precio).
- Los precios y costos unitarios tienen un tope de 99.999.999, de sobra para el negocio y seguro para un `integer` de PostgreSQL.
- Formato de pantalla: `$39.999`, sin espacio entre el signo y el número, con puntos de miles (`es-AR`). Los descuentos van con el signo menos tipográfico (U+2212): `−$3.600`.
- El descuento del kit se redondea a pesos enteros. El monto de cada cuota que se muestra en la ficha es informativo (`round(precio / N)`); el que se cobra es el que devuelve Mercado Pago.

## Consecuencias

- No hay errores de redondeo entre front, back y Mercado Pago: se suman enteros.
- El back convierte el entero a lo que pida Mercado Pago (`transaction_amount`) en un solo lugar.
- Si el negocio algún día vende con centavos, hay que cambiar el tipo, el contrato y la base: un ADR nuevo que reemplace a este.
- Las sumas de varias líneas pueden superar el tope de un precio unitario: el back tiene que guardar los totales en un tipo que alcance (un `integer` de PostgreSQL llega a 2.147.483.647).

## Alternativas consideradas

- **Centavos como enteros** (`3999900`): es lo habitual y lo más seguro si hubiera centavos, pero sería complejidad sin uso y habría que dividir por 100 en cada pantalla.
- **Decimales (`number` o `Decimal`)**: arrastran los errores de redondeo que se quieren evitar.
